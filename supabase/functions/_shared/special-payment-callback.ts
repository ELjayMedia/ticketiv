// @ts-nocheck -- Supabase Edge runs under Deno; project typecheck targets Next.js.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseSpecialPaymentCallback, validateSpecialPaymentReconciliation } from "./special-payment-validation.ts";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/** The internal callback HMAC is an extra gate, not proof that the provider was paid. */
async function signedByTicketiv(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  const candidate = header?.replace(/^sha256=/, "") ?? "";
  if (!/^[a-f0-9]{64}$/i.test(candidate)) return false;
  const bytes = new Uint8Array(candidate.match(/.{2}/g)!.map((hex) => Number.parseInt(hex, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(rawBody));
}

export async function serveSpecialPaymentCallback(req: Request, kind: "resale_checkout" | "waitlist_checkout"): Promise<Response> {
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  // Require a *distinct* per-endpoint HMAC and independent Paystack verification.
  const hmacKey = Deno.env.get(kind === "resale_checkout" ? "RESALE_PAYMENT_WEBHOOK_SECRET" : "WAITLIST_PAYMENT_WEBHOOK_SECRET");
  const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!url || !serviceKey || !hmacKey || !paystackKey) return json(503, { ok: false, error: "verification_not_configured" });

  const rawBody = await req.text();
  if (rawBody.length > 4096) return json(413, { ok: false, error: "payload_too_large" });
  if (!await signedByTicketiv(rawBody, req.headers.get("x-ticketiv-provider-signature"), hmacKey)) {
    return json(401, { ok: false, error: "invalid_signature" });
  }

  let raw: unknown;
  try { raw = JSON.parse(rawBody); } catch { return json(400, { ok: false, error: "invalid_json" }); }
  const input = parseSpecialPaymentCallback(raw, kind);
  if (!input) return json(400, { ok: false, error: "invalid_payment_fields" });

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const [paymentRead, orderRead, attemptsRead] = await Promise.all([
    db.from("payments").select("id, order_id, provider, status, amount_cents, currency, ext_payment_id, payload").eq("id", input.paymentId).maybeSingle(),
    db.from("orders").select("id, status, total_cents, currency").eq("id", input.orderId).maybeSingle(),
    db.from("payment_attempts").select("id, order_id, payment_id, provider, status, ext_ref").eq("payment_id", input.paymentId).eq("provider", "paystack").eq("ext_ref", input.providerReference).maybeSingle(),
  ]);
  if (paymentRead.error || orderRead.error || attemptsRead.error) return json(500, { ok: false, error: "database_read_failed" });
  if (!paymentRead.data || !orderRead.data || !attemptsRead.data) return json(409, { ok: false, error: "payment_not_bound" });

  let providerResult: Record<string, unknown>;
  try {
    const result = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(input.providerReference)}`, {
      method: "GET", headers: { Authorization: `Bearer ${paystackKey}` }, cache: "no-store",
    });
    const payload = await result.json();
    if (!result.ok || payload?.status !== true || !payload?.data) return json(502, { ok: false, error: "provider_verification_failed" });
    providerResult = payload.data;
  } catch {
    return json(502, { ok: false, error: "provider_unavailable" });
  }

  const mismatch = validateSpecialPaymentReconciliation({
    callback: input, kind, payment: paymentRead.data, order: orderRead.data, attempt: attemptsRead.data, providerResult,
  });
  if (mismatch) return json(409, { ok: false, error: mismatch });

  if (paymentRead.data.status === "pending") {
    const previousRef = paymentRead.data.ext_payment_id;
    let query = db.from("payments").update({
      status: "succeeded", provider: "paystack", ext_payment_id: input.providerReference,
      payload: { ...paymentRead.data.payload, provider_reference: input.providerReference, verified_by: "paystack_api" },
    }).eq("id", input.paymentId).eq("order_id", input.orderId).eq("status", "pending");
    query = previousRef === null ? query.is("ext_payment_id", null) : query.eq("ext_payment_id", previousRef);
    const update = await query.select("id").maybeSingle();
    if (update.error) return json(500, { ok: false, error: "payment_update_failed" });
    if (!update.data) {
      // A racing webhook/return may have finished the same payment already.
      const check = await db.from("payments").select("status, ext_payment_id").eq("id", input.paymentId).single();
      if (check.error || check.data?.status !== "succeeded" || check.data?.ext_payment_id !== input.providerReference) {
        return json(409, { ok: false, error: "payment_state_changed" });
      }
    }
  }

  const rpc = kind === "resale_checkout" ? "fn_complete_resale_after_payment_webhook" : "fn_complete_waitlist_after_payment_webhook";
  const completed = await db.rpc(rpc, { p_payment_id: input.paymentId });
  if (completed.error) {
    console.error(`[special-payment-callback] completion failed kind=${kind} payment=${input.paymentId}`, completed.error);
    return json(500, { ok: false, error: "completion_failed" });
  }
  // Never redirect to an untrusted returnUrl from callback payload.
  return json(200, { ok: true, paymentId: input.paymentId, status: "succeeded", alreadyCompleted: completed.data?.[0]?.already_completed ?? false });
}
