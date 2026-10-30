import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Client checkout surfaces must not import modules that reach
// `next/headers` (lib/currency → lib/supabase-server). Vitest doesn't enforce
// the client/server boundary, but Next fails the whole event page build.
const CLIENT_FILES = [
  "components/quiet/screens/event-detail/ticket-picker.tsx",
  "components/quiet/screens/checkout/mobile-checkout.tsx",
  "components/quiet/screens/checkout/desktop-checkout.tsx",
  "components/quiet/screens/checkout/contact-section.tsx",
  "components/quiet/screens/checkout/use-checkout.ts",
  "lib/calendar-links.ts",
  "lib/checkout/cart.ts",
  "lib/checkout/pricing.ts",
];

const SERVER_ONLY = [
  /from "@\/lib\/mappers\/checkout"/,
  /from "@\/lib\/currency"/,
  /from "@\/lib\/supabase-server"/,
  /from "@\/lib\/supabase\/admin"/,
  /from "@\/lib\/checkout\/availability"/,
];

describe("checkout client import boundary", () => {
  it.each(CLIENT_FILES)("%s stays client-safe", (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    for (const pattern of SERVER_ONLY) {
      // Type-only imports are erased and safe.
      const valueImports = source
        .split("\n")
        .filter((line) => pattern.test(line) && !/^import type /.test(line.trim()));
      expect(valueImports, `${file} imports server-only code`).toEqual([]);
    }
  });
});
