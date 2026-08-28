import { describe, expect, test } from "bun:test";
import { isExternalContentFile } from "./external-content-watch.js";

describe("isExternalContentFile", () => {
  test("matches markdown files inside watched site directories", () => {
    expect(
      isExternalContentFile(
        "/Users/matthias/git/digital-signature/site/index.md",
        ["/Users/matthias/git/digital-signature/site"]
      )
    ).toBe(true);
  });

  test("matches nav.yml inside watched site directories", () => {
    expect(
      isExternalContentFile(
        "/Users/matthias/git/digital-signature/site/nav.yml",
        ["/Users/matthias/git/digital-signature/site"]
      )
    ).toBe(true);
  });

  test("matches bookmarklet sources inside watched site directories", () => {
    expect(
      isExternalContentFile(
        "/Users/matthias/git/bookmarklets/site/bookmarklets/edit-page.js",
        ["/Users/matthias/git/bookmarklets/site"]
      )
    ).toBe(true);
  });

  test("ignores javascript outside the bookmarklets directory", () => {
    expect(
      isExternalContentFile(
        "/Users/matthias/git/digital-signature/site/assets/widget.js",
        ["/Users/matthias/git/digital-signature/site"]
      )
    ).toBe(false);
  });

  test("ignores files outside watched site directories", () => {
    expect(
      isExternalContentFile(
        "/Users/matthias/git/digital-signature/README.md",
        ["/Users/matthias/git/digital-signature/site"]
      )
    ).toBe(false);
  });
});
