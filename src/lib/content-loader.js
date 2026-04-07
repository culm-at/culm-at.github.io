import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { marked } from "marked";
import { z } from "zod";
import { discoverSources } from "./source-discovery.js";

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
      const html = marked.parse(parsed.content);

      pages.push({
        sourceId: source.id,
        routePath,
        html,
        body: parsed.content,
        meta,
        file
      });
    }

    sections.push({
      id: source.id,
      title: source.title,
      basePath: source.basePath,
      nav,
      mode
    });
  }

  pages.sort((a, b) => a.meta.order - b.meta.order);

  return { pages, sections, missing };
}

export function getPageByRoute(routePath) {
  const { pages } = loadSiteData();
  return pages.find((page) => page.routePath === routePath);
}
