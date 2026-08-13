import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("public discovery cache boundary", () => {
  it("keeps the root route in the public group without server auth reads", () => {
    const discovery = read("app/(public)/page.tsx");

    expect(fs.existsSync(path.join(root, "app/(consumer)/page.tsx"))).toBe(false);
    expect(discovery).toContain('export const dynamic = "force-static"');
    expect(discovery).toContain("export const revalidate = 60");
    expect(discovery).toContain("getPublicEventsList");
    expect(discovery).not.toContain("getCurrentUserProfile");
    expect(discovery).not.toContain("getMyContexts");
  });

  it("hydrates public identity in the browser and retains full consumer contexts", () => {
    const publicNav = read("components/quiet/shell/public-session-desktop-nav.tsx");
    const consumerLayout = read("app/(consumer)/layout.tsx");
    const frame = read("components/quiet/shell/consumer-frame.tsx");

    expect(publicNav).toContain("supabase.auth.getSession()");
    expect(publicNav).toContain("supabase.auth.onAuthStateChange");
    expect(publicNav).toContain('fetch("/api/auth/contexts")');
    expect(consumerLayout).toContain("getCurrentUserProfile");
    expect(consumerLayout).toContain("getMyContexts");
    expect(frame).toContain("<MobileTabBar />");
  });

  it("derives public-shell contexts only through the authenticated server model", () => {
    const contextsRoute = read("app/api/auth/contexts/route.ts");

    expect(contextsRoute).toContain("getMyContexts()");
    expect(contextsRoute).toContain("getActiveContextKey()");
    expect(contextsRoute).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });
});
