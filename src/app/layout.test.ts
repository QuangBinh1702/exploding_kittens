import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const layoutSource = readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf8");

describe("RootLayout", () => {
  test("does not inject DOM-mutating scripts before hydration", () => {
    expect(layoutSource).not.toContain("dangerouslySetInnerHTML");
    expect(layoutSource).not.toContain("MutationObserver");
    expect(layoutSource).not.toContain("bis_skin_checked");
  });
});
