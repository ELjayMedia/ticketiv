/**
 * Currency resolution for the active org.
 *
 * Pages should prefer a per-row `currency` column when present
 * (`v_events_public.currency`, `orders.currency`, etc). When the active org
 * matters but no row-level currency is in scope — e.g. the organizer's
 * dashboard chrome, or a fresh new-event draft — fall back to
 * `organizations.default_currency`. Final fallback is "SZL".
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Currency } from "@/lib/format";

const ALLOWED: ReadonlySet<Currency> = new Set<Currency>(["SZL", "ZAR", "USD", "EUR", "GBP"]);

export function asCurrency(raw: string | null | undefined): Currency {
  if (raw && ALLOWED.has(raw as Currency)) return raw as Currency;
  return "SZL";
}

export async function getOrgCurrency(orgId: string): Promise<Currency> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return "SZL";

  const { data, error } = await supabase
    .from("organizations")
    .select("default_currency")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !data) return "SZL";
  return asCurrency(data.default_currency);
}
