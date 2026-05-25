import { MyTickets } from "@/components/quiet/screens/tickets/my-tickets";
import { getMyTickets } from "@/lib/data/attendee/tickets";
import { getInboundTransfers } from "@/lib/data/attendee/inbound-transfers";
import { mapMyTickets } from "@/lib/mappers/tickets";
import { PHOTOS } from "@/lib/photos";

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
function avatarFor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0;
  return FACE_POOL[Math.abs(h) % FACE_POOL.length];
}

export default async function TicketsPage() {
  const [rows, inbound] = await Promise.all([
    getMyTickets(),
    getInboundTransfers(),
  ]);
  const props = mapMyTickets(rows);
  const next = inbound[0];
  const inboundTransfer = next
    ? {
        fromName: next.from_name,
        fromPhoto: avatarFor(next.from_user_id),
        eventTitle: next.event_title,
        expiresInLabel: expiresIn(next.expires_at),
      }
    : null;

  return (
    <div className="mx-auto max-w-[480px]">
      <MyTickets
        featured={props.featured}
        upcoming={props.upcoming}
        past={props.past}
        inboundTransfer={inboundTransfer}
        counts={{
          ...props.counts,
          transfers: inbound.length,
        }}
      />
    </div>
  );
}
