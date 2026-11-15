import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");
}

describe("Android safe-area startup regression", () => {
  for (const [app, path] of [
    ["Ticketiv attendee", "../App.tsx"],
    ["Ticketiv Access", "../../access/App.tsx"],
  ] as const) {
    it(`${app} reads insets without mounting the crashing Fabric RNCSafeAreaView`, () => {
      const text = source(path);
      expect(text).toContain("SafeAreaProvider");
      expect(text).toContain("useSafeAreaInsets()");
      expect(text).toContain("<SafeAreaFrame>");
      expect(text).not.toMatch(/<SafeAreaView\b/);
      expect(text).toContain("paddingTop: insets.top");
      expect(text).toContain("paddingBottom: insets.bottom");
      expect(text).toContain("paddingLeft: insets.left");
      expect(text).toContain("paddingRight: insets.right");
    });
  }
});
