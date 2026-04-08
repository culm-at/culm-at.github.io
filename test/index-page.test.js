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
