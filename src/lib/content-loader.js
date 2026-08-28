import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { marked } from "marked";
import { z } from "zod";
import { discoverSources } from "./source-discovery.js";
import { injectBookmarklets } from "./bookmarklets.js";

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[^;]+;/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function renderMarkdown(markdown) {
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const id = slugifyHeading(text);
    return `<h${depth} id="${id}"><a href="#${id}" class="heading-anchor">${text}</a></h${depth}>`;
  };

  return marked.parse(markdown, { renderer });
}

function isExternalOrAbsoluteLink(target) {
  return (
    target.startsWith("http://") ||
    target.startsWith("https://") ||
    target.startsWith("mailto:") ||
    target.startsWith("#") ||
    target.startsWith("/")
  );
}

function getSectionBase(routePath) {
  const firstSegment = routePath.split("/").filter(Boolean)[0];
  return firstSegment ? `/${firstSegment}` : "/";
}

function normalizeMarkdownTarget(target) {
  return target.replace(/\.(md|html)$/i, "").replace(/^\.\//, "");
}

export function rewriteRelativeMarkdownLinks(markdown, routePath) {
  const sectionBase = getSectionBase(routePath);
  return markdown.replace(/\]\(([^)]+)\)/g, (match, rawTarget) => {
    const target = rawTarget.trim();

    if (isExternalOrAbsoluteLink(target)) {
      return match;
    }

    const normalized = normalizeMarkdownTarget(target);
    const [pathPart, hashPart = ""] = normalized.split("#");
    const cleanPath = pathPart.toLowerCase();
    const withHash = hashPart ? `#${hashPart}` : "";

    if (!cleanPath || cleanPath === "index" || cleanPath === "home") {
      return `](${sectionBase}${withHash})`;
    }

    return `](${sectionBase}/${cleanPath}${withHash})`;
  });
}

export function stripRedundantTopHeading(markdown, title) {
  const lines = markdown.split("\n");
  if (lines.length === 0) {
    return markdown;
  }

  let firstHeadingIndex = 0;
  while (firstHeadingIndex < lines.length && lines[firstHeadingIndex].trim() === "") {
    firstHeadingIndex += 1;
  }

  if (firstHeadingIndex >= lines.length) {
    return markdown;
  }

  const first = lines[firstHeadingIndex].trim();
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedHeading = first.replace(/^#\s+/, "").trim().toLowerCase();

  if (!first.startsWith("# ") || normalizedHeading !== normalizedTitle) {
    return markdown;
  }

  return lines.slice(firstHeadingIndex + 1).join("\n").trim();
}

const pageSchema = z.object({
  title: z.string(),
  description: z.string(),
  section: z.string(),
  order: z.number(),
  slug: z.string().optional(),
  draft: z.boolean().optional(),
  updated: z.string().optional(),
  nav_title: z.string().optional()
});

function routeFromPage(sourceBasePath, fileName, frontmatter) {
  const baseName = path.basename(fileName, ".md");
  const inferred = baseName === "index" || baseName === "home" ? "" : baseName;
  const slug = frontmatter.slug === "index" ? "" : (frontmatter.slug ?? inferred);
  if (!slug) {
    return sourceBasePath;
  }
  return `${sourceBasePath}/${slug}`;
}

function readNavFile(sitePath) {
  const navPath = path.join(sitePath, "nav.yml");
  if (!fs.existsSync(navPath)) {
    return null;
  }
  return yaml.load(fs.readFileSync(navPath, "utf8"));
}

export function loadSiteData() {
  const { available, missing } = discoverSources();
  const pages = [];
  const sections = [];

  for (const { source, sitePath, mode } of available) {
    const nav = readNavFile(sitePath);
    const files = fs
      .readdirSync(sitePath)
      .filter((file) => file.endsWith(".md"));

    for (const file of files) {
      const fullPath = path.join(sitePath, file);
      const parsed = matter(fs.readFileSync(fullPath, "utf8"));
      const meta = pageSchema.parse(parsed.data);

      if (meta.draft && import.meta.env.PROD) {
        continue;
      }

      const routePath = routeFromPage(source.basePath, file, meta);
      const deDuplicatedMarkdown = stripRedundantTopHeading(parsed.content, meta.title);
      const linkedMarkdown = rewriteRelativeMarkdownLinks(deDuplicatedMarkdown, routePath);
      const html = injectBookmarklets(renderMarkdown(linkedMarkdown), sitePath, source.repo);

      pages.push({
        sourceId: source.id,
        routePath,
        html,
        body: linkedMarkdown,
        meta,
        file
      });
    }

    sections.push({
      id: source.id,
      title: source.title,
      basePath: source.basePath,
      nav,
      mode,
      // Secondary sources are side projects: they get a muted link on the homepage
      // instead of a card, and stay out of the docs topbar entirely.
      secondary: source.secondary === true
    });
  }

  pages.sort((a, b) => a.meta.order - b.meta.order);

  return { pages, sections, missing };
}

export function getPageByRoute(routePath) {
  const { pages } = loadSiteData();
  return pages.find((page) => page.routePath === routePath);
}
