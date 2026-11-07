// @ts-nocheck -- Deno is provided by the Supabase Edge runtime, not Next.js.
// Legacy Supabase Edge Function retired for security. The previous deployed
// implementation accepted arbitrary recipient IDs with only a publishable/anon
// JWT and used service-role credentials to broadcast messages. Do not restore
// it without explicit caller authorization and recipient-scoped permissions.
Deno.serve(() =>
  new Response(JSON.stringify({ error: "Notification endpoint retired" }), {
    status: 410,
    headers: { "Content-Type": "application/json" },
  }),
)
