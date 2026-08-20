import { MyTickets } from "@/components/quiet/screens/tickets/my-tickets";
import { SaveMyTicketsCard } from "@/components/quiet/screens/tickets/save-my-tickets-card";
import { ClaimGuestOrdersCard } from "@/components/quiet/screens/tickets/claim-guest-orders-card";
import { getMyTickets } from "@/lib/data/attendee/tickets";
import { findClaimableGuestOrders } from "@/lib/data/attendee/guest-claim";
import { getInboundTransfers } from "@/lib/data/attendee/inbound-transfers";
import { getMyTransferHistory } from "@/lib/data/attendee/transfers";
import { mapMyTickets } from "@/lib/mappers/tickets";
import { PHOTOS } from "@/lib/photos";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const metadata = { title: "My tickets" };
export const dynamic = "force-dynamic";

function expiresIn(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `expires in ${h}h`;
  return `expires in ${Math.floor(h / 24)}d`;
}

const FACE_POOL = [
  PHOTOS.face_1, PHOTOS.face_2, PHOTOS.face_3, PHOTOS.face_4,
  PHOTOS.face_5, PHOTOS.face_6, PHOTOS.face_7, PHOTOS.face_8,
];

interface TicketsSearchParams {
  tab?: string | string[];
  checkedIn?: string | string[];
}

function avatarFor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0;
  return FACE_POOL[Math.abs(h) % FACE_POOL.length];
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams?: Promise<TicketsSearchParams>;
}) {
  const [rows, inbound, history, query] = await Promise.all([
    getMyTickets(),
    getInboundTransfers(),
    getMyTransferHistory(),
    searchParams ?? Promise.resolve<TicketsSearchParams>({}),
  ]);
  const props = mapMyTickets(rows);
  const next = inbound[0];
  const inboundTransfer = next
    ? {
        transferId: next.transfer_id,
        fromName: next.from_name,
        fromPhoto: avatarFor(next.from_user_id),
        eventTitle: next.event_title,
        expiresInLabel: expiresIn(next.expires_at),
      }
    : null;

  // The dedicated /transfers hub models expiration explicitly. The older
  // embedded Transfers segment predates that enum value, so treat expiration
  // as a closed/cancelled request there instead of widening its legacy UI type.
  const transferHistory = history.map((h) => ({
    id: h.id,
    direction: h.direction,
    status: h.status === "expired" ? "cancelled" as const : h.status,
    eventTitle: h.eventTitle,
    counterpartyName: h.counterpartyName,
    counterpartyPhoto: avatarFor(h.counterpartyId),
    dateLabel: new Date(h.createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    canCancel: h.canCancel,
  }));

  // Show the "Save my tickets" prompt only to anonymous (guest) buyers.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const isAnonymous = Boolean(user && (user as { is_anonymous?: boolean }).is_anonymous);

  // Verified accounts: surface any guest orders bought under a prior session.
  const claimable = user && !isAnonymous ? await findClaimableGuestOrders() : [];

  return (
    <div className="mx-auto flex max-w-[480px] flex-col gap-4">
      {isAnonymous && (
        <div className="px-4 pt-4">
          <SaveMyTicketsCard />
        </div>
      )}
      {claimable.length > 0 && (
        <div className="px-4 pt-4">
          <ClaimGuestOrdersCard count={claimable.length} />
        </div>
      )}
      <MyTickets
        featured={props.featured}
        upcoming={props.upcoming}
        past={props.past}
        initialSegment={
          query.tab === "past" || query.tab === "transfers" ? query.tab : "upcoming"
        }
        highlightedTicketId={typeof query.checkedIn === "string" ? query.checkedIn : null}
        inboundTransfer={inboundTransfer}
        transferHistory={transferHistory}
        counts={{
          ...props.counts,
          transfers: inbound.length + transferHistory.length,
        }}
      />
    </div>
  );
}
