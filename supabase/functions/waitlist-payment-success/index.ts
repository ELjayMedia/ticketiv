// @ts-nocheck -- Supabase Edge runs under Deno.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serveSpecialPaymentCallback } from "../_shared/special-payment-callback.ts";

Deno.serve((req) => serveSpecialPaymentCallback(req, "waitlist_checkout"));
