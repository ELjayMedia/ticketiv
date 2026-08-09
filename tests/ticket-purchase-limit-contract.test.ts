import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const createRoute = source("app/api/events/[eventId]/tickets/route.ts");
const sharedCreateRoute = source("app/api/ticket-types/route.ts");
const updateRoute = source("app/api/events/[eventId]/tickets/[ticketTypeId]/route.ts");
const organizerForm = source("components/event-wizard/steps/TicketsStep.tsx");
const organizerTicketForm = source("app/orgs/[orgId]/events/[eventId]/tickets/_components/ticket-type-form.tsx");
const legacyOrganizerForm = source("components/tickets/create-ticket-type-form.tsx");
const checkoutPage = source("app/(focused)/events/[id]/checkout/page.tsx");
const serverGuard = source("supabase/migrations/20260726120000_rate_limit_rollout_checkout.sql");
const availabilityGuard = source("supabase/migrations/20260809083000_align_ticket_purchase_limits.sql");

describe("ticket purchase-limit contract", () => {
  it("does not reintroduce a default organizer purchase limit", () => {
    expect(createRoute).toContain("parseOptionalPurchaseLimit(body.per_user_limit)");
    expect(createRoute).toContain("parseOptionalPurchaseLimit(body.online_per_order_limit)");
    expect(createRoute).not.toContain("? 10 :");
    expect(sharedCreateRoute).toContain("parseOptionalPurchaseLimit(rawPerUserLimit)");
    expect(organizerForm).toContain('per_user_limit: ""');
    expect(organizerForm).toContain('online_per_order_limit: ""');
    expect(organizerTicketForm).toContain("purchaseLimitInputValue(defaultValues?.per_user_limit)");
    expect(legacyOrganizerForm).not.toContain("useState(4)");
    expect(legacyOrganizerForm).not.toContain("per_order_limit: 10");
  });

  it("loads and maps the online per-order limit for checkout", () => {
    expect(checkoutPage).toContain('.from("ticket_type_channels")');
    expect(checkoutPage).toContain('.eq("channel", "online")');
    expect(checkoutPage).toContain("per_order_limit: perOrderLimitMap.get(t.id) ?? null");
  });

  it("validates updated limits against persisted organizer settings", () => {
    expect(updateRoute).toContain("ticket_type_channels(channel, quota, per_order_limit)");
    expect(updateRoute).toContain("isPerOrderLimitWithinBuyerLimit(nextPerUserLimit, nextPerOrderLimit)");
    expect(updateRoute).toContain("nextOnlineQuota > nextQuota");
  });

  it("keeps server-side per-buyer, per-order and channel-quota enforcement", () => {
    expect(serverGuard).toContain("v_existing_user_qty + v_requested_qty");
    expect(serverGuard).toContain("per_user_limit_exceeded:");
    expect(serverGuard).toContain("v_requested_qty > v_channel_row.per_order_limit");
    expect(serverGuard).toContain("channel_per_order_limit_exceeded:");
    expect(serverGuard).toContain("v_reserved_qty + v_requested_qty");
    expect(serverGuard).toContain("channel_sold_out:");
  });

  it("makes the default unlimited and reports online-channel remaining inventory", () => {
    expect(availabilityGuard).toContain("alter column per_user_limit drop default");
    expect(availabilityGuard).toContain("reserved.all_channels");
    expect(availabilityGuard).toContain("reserved.online");
    expect(availabilityGuard).toContain("when channels.has_channels and online.ticket_type_id is null then 0");
    expect(availabilityGuard).toContain("online.quota - coalesce(reserved.online, 0)");
  });
});
