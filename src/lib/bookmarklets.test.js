import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import {
  escapeHtml,
  injectBookmarklets,
  parseMetadata,
  renderBookmarkletGallery,
  toBookmarklet
} from "./bookmarklets.js";

const SAMPLE = `/**
 * @title Copy as Markdown Link
 * @description Copies the current page as a Markdown link,
 *              escaping square brackets in the title.
 * @order 10
 */
navigator.clipboard.writeText("[" + document.title + "](" + location.href + ")");
`;

describe("parseMetadata", () => {
  test("reads title, multi-line description and order", () => {
    const meta = parseMetadata(SAMPLE, "copy-markdown-link.js");
    expect(meta.title).toBe("Copy as Markdown Link");
    expect(meta.description).toBe(
      "Copies the current page as a Markdown link, escaping square brackets in the title."
    );
    expect(meta.order).toBe(10);
  });

  test("falls back to a title derived from the filename", () => {
    const meta = parseMetadata("alert(1);", "strip-tracking-params.js");
    expect(meta.title).toBe("Strip Tracking Params");
    expect(meta.description).toBe("");
    expect(meta.order).toBe(999);
  });

  test("defaults the order when the tag is missing or unparseable", () => {
    expect(parseMetadata("/**\n * @title X\n */\nalert(1);", "x.js").order).toBe(999);
    expect(parseMetadata("/**\n * @order later\n */\nalert(1);", "x.js").order).toBe(999);
  });
});

describe("toBookmarklet", () => {
  const href = toBookmarklet(SAMPLE);

  test("produces an attribute-safe javascript: URL", () => {
    expect(href.startsWith("javascript:")).toBe(true);
    expect(href).not.toContain(" ");
    expect(href).not.toContain('"');
    expect(href).not.toContain("<");
    expect(href).not.toContain("&");
  });

  test("strips the metadata comment and condenses the source", () => {
    const decoded = decodeURIComponent(href.slice("javascript:".length));
    expect(decoded).not.toContain("@title");
    expect(decoded).not.toContain("Copies the current page");
    expect(decoded.length).toBeLessThan(SAMPLE.length);
  });

  test("wraps the body so declarations cannot leak into the host page", () => {
    // A side effect is required: esbuild eliminates an IIFE whose body does nothing.
    const decoded = decodeURIComponent(
      toBookmarklet("const x = 41; globalThis.__bm = x + 1;").slice("javascript:".length)
    );
    expect(decoded.startsWith("(function(")).toBe(true);

    new Function(decoded)();
    expect(globalThis.__bm).toBe(42);
    // `x` stayed inside the IIFE rather than leaking into the host page.
    expect(decoded).not.toMatch(/^const /m);
    delete globalThis.__bm;
  });

  test("ends with a completion value that cannot navigate the page away", () => {
    const decoded = decodeURIComponent(
      toBookmarklet("return 'would navigate';").slice("javascript:".length)
    );
    expect(decoded.endsWith("void 0;")).toBe(true);
    expect(new Function(`return eval(${JSON.stringify(decoded)})`)()).toBeUndefined();
  });
});

describe("renderBookmarkletGallery", () => {
  const items = [
    {
      file: "evil.js",
      title: "Evil <b>Title</b>",
      description: 'Uses "quotes" & <angles>.',
      order: 1,
      source: 'alert("<script>");',
      href: "javascript:alert(1)"
    }
  ];

  test("escapes titles, descriptions and source bodies", () => {
    const html = renderBookmarkletGallery(items, "culmat/bookmarklets");
    expect(html).not.toContain("<b>Title</b>");
    expect(html).toContain("Evil &lt;b&gt;Title&lt;/b&gt;");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('alert(&quot;');
  });

  test("links each entry to its file on GitHub", () => {
    const html = renderBookmarkletGallery(items, "culmat/bookmarklets");
    expect(html).toContain("https://github.com/culmat/bookmarklets/blob/main/site/bookmarklets/evil.js");
  });

  test("renders nothing for an empty collection", () => {
    expect(renderBookmarkletGallery([], "culmat/bookmarklets")).toBe("");
  });
});

describe("injectBookmarklets", () => {
  test("leaves markup without the marker byte-identical", () => {
    const html = "<h1>Installation</h1>\n<p>Install via Marketplace.</p>";
    expect(injectBookmarklets(html, "/does/not/exist", "culmat/x")).toBe(html);
  });

  test("does not expand $& and friends from a bookmarklet source", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bm-"));
    fs.mkdirSync(path.join(dir, "bookmarklets"));
    fs.writeFileSync(
      path.join(dir, "bookmarklets", "dollar.js"),
      'document.title = document.title.replace(/x/g, "\\$&");\n'
    );

    const out = injectBookmarklets("<div data-bookmarklets></div>", dir, "culmat/x");
    expect(out).not.toContain("data-bookmarklets");
    expect(out).toContain("\\$&amp;");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("replaces the marker, and drops it when there are no bookmarklets", () => {
    const html = "<p>Intro</p>\n<div data-bookmarklets></div>\n<p>Outro</p>";
    const out = injectBookmarklets(html, "/does/not/exist", "culmat/x");
    expect(out).not.toContain("data-bookmarklets");
    expect(out).toContain("<p>Intro</p>");
    expect(out).toContain("<p>Outro</p>");
  });
});

describe("escapeHtml", () => {
  test("escapes the four characters that break attributes and text nodes", () => {
    expect(escapeHtml('&<>"')).toBe("&amp;&lt;&gt;&quot;");
  });
});
