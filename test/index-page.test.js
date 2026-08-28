import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";

describe("homepage cards", () => {
  test("do not show source-status labels", () => {
    const page = fs.readFileSync(path.resolve(process.cwd(), "src/pages/index.astro"), "utf8");
    expect(page.includes("Local source")).toBe(false);
    expect(page.includes("Mirrored source")).toBe(false);
  });

  test("shows a Cleancentive card", () => {
    const page = fs.readFileSync(path.resolve(process.cwd(), "src/pages/index.astro"), "utf8");
    expect(page.includes("https://cleancentive.org/")).toBe(true);
    expect(page.includes("Cleancentive")).toBe(true);
  });
});

describe("secondary sources", () => {
  const read = (file) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

  test("only the card grid is limited to primary sections", () => {
    const page = read("src/pages/index.astro");
    expect(page.includes("primarySections.map")).toBe(true);
    expect(page.includes("secondary-links")).toBe(true);
  });

  test("the docs topbar leaves secondary sections out", () => {
    const layout = read("src/layouts/DocLayout.astro");
    expect(layout.includes("navSections.map")).toBe(true);
    expect(layout.includes("(section) => !section.secondary")).toBe(true);
  });

  test("bookmarklets is the only secondary source", () => {
    const { sources } = JSON.parse(read("content/sources.json"));
    const secondary = sources.filter((source) => source.secondary === true);
    expect(secondary.map((source) => source.id)).toEqual(["bookmarklets"]);
    expect(sources.length).toBeGreaterThan(1);
  });
});
