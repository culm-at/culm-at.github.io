import fs from "node:fs";
import path from "node:path";
import { transformSync } from "esbuild";

// Marker a source repo puts in its markdown to request the generated gallery.
const GALLERY_MARKER = '<div data-bookmarklets></div>';

const DEFAULT_ORDER = 999;

function titleFromFileName(fileName) {
  return path
    .basename(fileName, ".js")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Reads @title / @description / @order out of the leading block comment. The comment is
 * dropped by minification, so this metadata never reaches the condensed bookmarklet.
 */
export function parseMetadata(source, fileName = "") {
  const block = source.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  const fallback = {
    title: titleFromFileName(fileName),
    description: "",
    order: DEFAULT_ORDER
  };

  if (!block) {
    return fallback;
  }

  const body = block[1]
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, ""))
    .join("\n");

  const tags = {};
  const tagPattern = /@(title|description|order)\s+([\s\S]*?)(?=\n\s*@(?:title|description|order)\b|$)/g;
  let match;
  while ((match = tagPattern.exec(body)) !== null) {
    tags[match[1]] = match[2].replace(/\s+/g, " ").trim();
  }

  const order = Number.parseInt(tags.order ?? "", 10);

  return {
    title: tags.title || fallback.title,
    description: tags.description || fallback.description,
    order: Number.isNaN(order) ? DEFAULT_ORDER : order
  };
}

/**
 * Wraps the cleartext source in an IIFE, minifies it, and encodes it as a `javascript:`
 * URL. encodeURIComponent escapes `"`, `<`, `>`, `&` and spaces, so the result is safe
 * verbatim inside an HTML attribute.
 */
export function toBookmarklet(source) {
  const wrapped = `(function(){${source}\n})();`;
  const { code } = transformSync(wrapped, { minify: true, target: "es2019" });

  const body = code.trim();
  const terminated = body === "" || body.endsWith(";") ? body : `${body};`;

  // `void 0` is appended *after* minification on purpose: esbuild discards it as a
  // no-op statement, but as the script's final completion value it is what stops the
  // browser from navigating away should a bookmarklet body `return` something.
  return `javascript:${encodeURIComponent(`${terminated}void 0;`)}`;
}

export function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Loads every `<sitePath>/bookmarklets/*.js`, sorted by @order then title.
 */
export function readBookmarklets(sitePath) {
  const dir = path.join(sitePath, "bookmarklets");
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".js"))
    .map((file) => {
      const source = fs.readFileSync(path.join(dir, file), "utf8");
      const meta = parseMetadata(source, file);
      return { file, source: source.trim(), href: toBookmarklet(source), ...meta };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

function blobUrl(repo, file) {
  if (!repo) {
    return null;
  }
  return `https://github.com/${repo}/blob/main/site/bookmarklets/${file}`;
}

export function renderBookmarkletGallery(items, repo) {
  if (items.length === 0) {
    return "";
  }

  const cards = items.map((item) => {
    const source = blobUrl(repo, item.file);
    const description = item.description
      ? `<p class="bookmarklet-description">${escapeHtml(item.description)}</p>`
      : "";

    return `<li class="bookmarklet">
  <h3 id="${escapeHtml(item.file.replace(/\.js$/, ""))}">${escapeHtml(item.title)}</h3>
  ${description}
  <p class="bookmarklet-actions">
    <a class="bookmarklet-drag" draggable="true" href="${item.href}">${escapeHtml(item.title)}</a>
    <button type="button" class="bookmarklet-copy">Copy</button>
    <span class="bookmarklet-hint" hidden>Drag this onto your bookmarks bar.</span>
  </p>
  <details class="bookmarklet-source">
    <summary>Source — ${escapeHtml(item.file)}</summary>
    <pre><code>${escapeHtml(item.source)}</code></pre>
    ${source ? `<p><a href="${source}">View on GitHub</a></p>` : ""}
  </details>
</li>`;
  });

  return `<ul class="bookmarklet-list">\n${cards.join("\n")}\n</ul>`;
}

/**
 * Replaces the gallery marker with generated HTML. Returns `html` untouched when the
 * marker is absent, so no file reads or minification happen for other pages.
 */
export function injectBookmarklets(html, sitePath, repo) {
  if (!html.includes(GALLERY_MARKER)) {
    return html;
  }
  const gallery = renderBookmarkletGallery(readBookmarklets(sitePath), repo);
  // A function replacer, not a string: bookmarklet sources may legitimately contain
  // `$&` / `$1`, which String.replace would otherwise expand against the match.
  return html.replace(GALLERY_MARKER, () => gallery);
}
