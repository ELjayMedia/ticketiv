import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { activeAccountHref, isAccountPath, ACCOUNT_NAV } from "@/components/quiet/shell/account-nav";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("desktop navigation", () => {
  it("gives every public page the site nav, cookie-free", () => {
    const layout = read("app/(public)/layout.tsx");
    expect(layout).toContain("<ConsumerFrame desktopNav={<PublicSessionDesktopNav />}>");
    // Auth is hydrated in the browser so public pages stay cacheable.
    expect(layout).not.toContain("getCurrentUserProfile");
    expect(layout).not.toContain("getMyContexts");
    // Discover gets the frame from the layout, not twice.
    expect(read("app/(public)/page.tsx")).not.toContain("ConsumerFrame");
  });

  it("keeps the site nav on the desktop event page", () => {
    const page = read("app/(focused)/events/[id]/page.tsx");
    expect(page).toContain("<PublicSessionDesktopNav />");
    expect(page).toMatch(/hidden md:block[^>]*>\s*<PublicSessionDesktopNav \/>/);
    expect(page).not.toContain("getCurrentUserProfile");
  });

  it("links signed-in attendees to their own pages", () => {
    const nav = read("components/quiet/shell/desktop-nav.tsx");
    expect(nav).toContain('{ href: "/tickets", label: "My tickets", signedInOnly: true }');
    expect(nav).toContain("<AccountMenu");
    const menu = read("components/quiet/shell/account-menu.tsx");
    expect(menu).toContain('action="/api/sign-out" method="post"');
  });

  it("puts account pages in the desktop sidebar, but not focused flows", () => {
    for (const p of ["/tickets", "/tickets/abc", "/orders", "/orders/123", "/me", "/notifications", "/favourites", "/friends", "/calendar", "/transfers", "/resale", "/waitlist"]) {
      expect(isAccountPath(p), p).toBe(true);
    }
    for (const p of ["/", "/events/x", "/search", "/series", "/tickets/abc/transfer", "/orders/1/refund", "/tickets-old", "/help"]) {
      expect(isAccountPath(p), p).toBe(false);
    }
    expect(activeAccountHref("/orders/123")).toBe("/orders");
    const hrefs = ACCOUNT_NAV.flatMap((g) => g.items.map((i) => i.href));
    for (const href of hrefs) {
      expect(fs.existsSync(path.join(root, "app/(consumer)", href.slice(1), "page.tsx")), href).toBe(true);
    }
    expect(read("components/quiet/shell/consumer-frame.tsx")).toContain("<AccountDesktopLayout>{children}</AccountDesktopLayout>");
  });
});
