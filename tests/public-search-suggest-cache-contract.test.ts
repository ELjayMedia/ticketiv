import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("public search suggestion cache boundary", () => {
  it("uses the cookie-free public client for anonymous search", () => {
    const search = read("lib/data/public/search.ts");

    expect(search).toContain("createPublicSupabaseClient()");
    expect(search).not.toContain("createServerSupabaseClient");
    expect(search).not.toContain("cookies()");
  });

  it("caches successful suggestions briefly without caching 429 responses", () => {
    const route = read("app/api/search/suggest/route.ts");
    const rateLimit = read("lib/rate-limit.ts");

    expect(route).toContain("public, s-maxage=30, stale-while-revalidate=60");
    expect(route.indexOf("if (!rl.allowed) return tooManyRequests(rl)")).toBeLessThan(
      route.indexOf("{ headers: SUGGEST_CACHE_HEADERS }"),
    );
    expect(rateLimit).not.toContain("s-maxage");
    expect(rateLimit).toContain("status: 429");
  });

  it("keeps the search function close to the Supabase region", () => {
    const vercelConfig = JSON.parse(read("vercel.json"));

    expect(vercelConfig.functions["app/api/search/suggest/route.ts"].regions).toEqual(["dub1"]);
  });
});
