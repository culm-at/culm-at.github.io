import { describe, expect, test } from "bun:test";
import { renderMarkdown, rewriteRelativeMarkdownLinks, stripRedundantTopHeading } from "./content-loader.js";

describe("rewriteRelativeMarkdownLinks", () => {
  test("rewrites section index-relative links to absolute section paths", () => {
    const input = "See [Installation](installation).";
    const output = rewriteRelativeMarkdownLinks(input, "/digital-signature");
    expect(output).toContain("[Installation](/digital-signature/installation)");
  });

  test("leaves external links unchanged", () => {
    const input = "Read [docs](https://example.com/docs).";
    const output = rewriteRelativeMarkdownLinks(input, "/digital-signature");
    expect(output).toBe(input);
  });

  test("rewrites legacy html links to section paths", () => {
    const input = "See [Installation](installation.html).";
    const output = rewriteRelativeMarkdownLinks(input, "/digital-signature");
    expect(output).toContain("[Installation](/digital-signature/installation)");
  });
});

describe("stripRedundantTopHeading", () => {
  test("removes top h1 when it duplicates frontmatter title", () => {
    const input = "# Installation\n\nInstall via Marketplace.";
    const output = stripRedundantTopHeading(input, "Installation");
    expect(output).toBe("Install via Marketplace.");
  });

  test("removes top h1 even when markdown starts with blank lines", () => {
    const input = "\n# Installation\n\nInstall via Marketplace.";
    const output = stripRedundantTopHeading(input, "Installation");
    expect(output).toBe("Install via Marketplace.");
  });
});

describe("renderMarkdown", () => {
  test("adds anchor ids to headings", () => {
    const html = renderMarkdown("## Trust & Legal");
    expect(html).toContain('<h2 id="trust-legal">');
    expect(html).toContain('<a href="#trust-legal"');
  });
});
