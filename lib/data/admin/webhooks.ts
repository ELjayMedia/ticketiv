// Source: webhook_endpoints (outbound) + webhook_deliveries + webhooks (inbound).

import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

export interface OutboundEndpoint {
  id: string
  org_id: string | null
  url: string
  description: string | null
  events: string[]
  is_active: boolean
  last_delivery_at: string | null
  last_status_code: number | null
  created_at: string
  org_name: string | null
}

export interface DeliveryTail {
  id: string
  endpoint_id: string
  endpoint_url: string
  event_type: string
  attempt_no: number
  response_status: number | null
  duration_ms: number | null
  delivered_at: string | null
  created_at: string
}

export interface InboundWebhook {
  id: string
  provider: string
  signature: string | null
  received_at: string
  processed_at: string | null
  provider_event_id: string | null
}

export interface WebhooksOverview {
  outbound: OutboundEndpoint[]
  inbound: InboundWebhook[]
  tail: DeliveryTail[]
}

export async function getWebhooksOverview(): Promise<WebhooksOverview> {
  const admin = createAdminClient()

  const [endpointsRes, deliveriesRes, inboundRes] = await Promise.all([
    admin
      .from("webhook_endpoints")
      .select("id, org_id, url, description, events, is_active, last_delivery_at, last_status_code, created_at, organizations(name)")
      .order("created_at", { ascending: false }),
    admin
      .from("webhook_deliveries")
      .select("id, endpoint_id, event_type, attempt_no, response_status, duration_ms, delivered_at, created_at, webhook_endpoints(url)")
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("webhooks")
      .select("id, provider, signature, received_at, processed_at, provider_event_id")
      .order("received_at", { ascending: false })
      .limit(40),
  ])

  const outbound: OutboundEndpoint[] = (endpointsRes.data ?? []).map((e) => ({
    id: e.id,
    org_id: e.org_id,
    url: e.url,
    description: e.description,
    events: e.events ?? [],
    is_active: e.is_active,
    last_delivery_at: e.last_delivery_at,
    last_status_code: e.last_status_code,
    created_at: e.created_at,
    org_name: (e.organizations as unknown as { name: string } | null)?.name ?? null,
  }))

  const tail: DeliveryTail[] = (deliveriesRes.data ?? []).map((d) => ({
    id: d.id,
    endpoint_id: d.endpoint_id,
    endpoint_url: (d.webhook_endpoints as unknown as { url: string } | null)?.url ?? "—",
    event_type: d.event_type,
    attempt_no: d.attempt_no,
    response_status: d.response_status,
    duration_ms: d.duration_ms,
    delivered_at: d.delivered_at,
    created_at: d.created_at,
  }))

  return {
    outbound,
    // Never ship the raw inbound signature to the client — collapse it to a
    // presence marker so the UI can show "present" without exposing the HMAC.
    inbound: ((inboundRes.data ?? []) as InboundWebhook[]).map((w) => ({
      ...w,
      signature: w.signature ? "present" : null,
    })),
    tail,
  }
}
