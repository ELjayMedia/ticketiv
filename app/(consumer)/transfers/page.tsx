import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Button } from "@/components/quiet/ui/button";
import { Chip } from "@/components/quiet/ui/chip";
import { Icon } from "@/components/quiet/ui/icon";
import {
  acceptTransfer,
  cancelTransfer,
  declineTransfer,
  getMyTransferHistory,
  type TransferDisplayStatus,
  type TransferHistoryItem,
} from "@/lib/data/attendee/transfers";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const metadata = { title: "Transfers" };
export const dynamic = "force-dynamic";

function formatWhen(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-SZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(item: TransferHistoryItem): string {
  if (item.status === "pending" || item.status === "requested") {
    return item.direction === "received" ? "Needs response" : "Awaiting response";
  }
  const labels: Record<Exclude<TransferDisplayStatus, "pending" | "requested">, string> = {
    accepted: "Accepted",
    declined: "Declined",
    cancelled: "Cancelled",
    completed: "Transferred",
    expired: "Expired",
  };
  return labels[item.status];
}

function statusVariant(status: TransferDisplayStatus): "accent" | "muted" | "default" {
  if (status === "pending" || status === "requested" || status === "completed") return "accent";
  if (status === "expired" || status === "cancelled" || status === "declined") return "muted";
  return "default";
}

async function acceptAction(formData: FormData) {
  "use server";
  const id = String(formData.get("transferId") ?? "");
  if (!id) return;
  await acceptTransfer(id);
  revalidatePath("/transfers");
  revalidatePath("/tickets");
}

async function declineAction(formData: FormData) {
  "use server";
  const id = String(formData.get("transferId") ?? "");
  if (!id) return;
  await declineTransfer(id);
  revalidatePath("/transfers");
}

async function cancelAction(formData: FormData) {
  "use server";
  const id = String(formData.get("transferId") ?? "");
  if (!id) return;
  await cancelTransfer(id);
  revalidatePath("/transfers");
  revalidatePath("/tickets");
}

export default async function TransfersPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login?from=/transfers");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=/transfers");

  const transfers = await getMyTransferHistory();
  const incoming = transfers.filter((item) => item.direction === "received");
  const outgoing = transfers.filter((item) => item.direction === "sent");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 pb-28 pt-8 md:px-8 md:pt-12">
      <header className="flex items-start gap-3">
        <Link
          href="/me"
          aria-label="Back to account"
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="chevL" size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Ticket ownership</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-ink">Transfers</h1>
          <p className="mt-2 max-w-xl text-[13px] leading-5 text-ink-3">
            A ticket changes owner only after the recipient accepts. The original order stays with the purchaser for audit history.
          </p>
        </div>
      </header>

      {transfers.length === 0 ? (
        <section className="mt-10 rounded-[var(--radius-lg)] border border-line bg-surface p-6 text-center">
          <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="arrowUR" size={18} />
          </div>
          <h2 className="mt-4 text-[16px] font-semibold">No ticket transfers yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-ink-3">
            Open one of your tickets and choose Transfer ticket to send it to a friend or another Ticketiv account.
          </p>
          <Link href="/tickets" className="mt-5 inline-flex">
            <Button variant="primary">My tickets</Button>
          </Link>
        </section>
      ) : (
        <div className="mt-8 space-y-9">
          <TransferSection title="Incoming" items={incoming} />
          <TransferSection title="Sent" items={outgoing} />
        </div>
      )}
    </main>
  );
}

function TransferSection({ title, items }: { title: string; items: TransferHistoryItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <span className="font-mono text-[11px] text-ink-3">{items.length}</span>
      </div>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg text-ink-2">
                <Icon name={item.direction === "received" ? "arrowDL" : "arrowUR"} size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[14px] font-semibold">{item.eventTitle}</span>
                  <Chip variant={statusVariant(item.status)} size="sm">
                    {statusLabel(item)}
                  </Chip>
                </div>
                <p className="mt-1 font-mono text-[11px] text-ink-3">
                  {item.ticketTypeName ?? "Ticket"} · {item.direction === "received" ? "From" : "To"} {item.counterpartyName}
                </p>
                <p className="mt-1 text-[11px] text-ink-3">
                  {formatWhen(item.createdAt)}
                  {item.expiresAt && (item.status === "pending" || item.status === "requested")
                    ? ` · Expires ${formatWhen(item.expiresAt)}`
                    : ""}
                </p>
              </div>
            </div>

            {(item.canAccept || item.canDecline || item.canCancel) && (
              <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-3">
                {item.canDecline && (
                  <form action={declineAction}>
                    <input type="hidden" name="transferId" value={item.id} />
                    <Button type="submit" variant="outline" size="sm">Decline</Button>
                  </form>
                )}
                {item.canAccept && (
                  <form action={acceptAction}>
                    <input type="hidden" name="transferId" value={item.id} />
                    <Button type="submit" variant="accent" size="sm">Accept ticket</Button>
                  </form>
                )}
                {item.canCancel && (
                  <form action={cancelAction}>
                    <input type="hidden" name="transferId" value={item.id} />
                    <Button type="submit" variant="outline" size="sm">Cancel transfer</Button>
                  </form>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
