import Link from "next/link";

export interface PaySeparatelyTicket {
  id: string;
  name: string;
  quantity: number;
  /** Buyer-facing method names, e.g. "MTN MoMo". */
  methods: string[];
  /** Checkout for just this ticket. */
  href: string;
}

/**
 * Shown when a cart mixes tickets the organiser set to different payment
 * methods, with none in common: say which ticket takes which method and let
 * the buyer check out each one on its own.
 */
export function PaySeparatelyNotice({ tickets, editTicketsHref }: { tickets: PaySeparatelyTicket[]; editTicketsHref: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-5 py-12">
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-line bg-surface p-6">
        <p className="font-mono text-[11px] font-semibold uppercase text-warning">Pay separately</p>
        <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">These tickets use different payment methods</h1>
        <p className="mt-3 text-[14px] leading-6 text-ink-3">
          The organiser takes different payment methods for these tickets, so they can&apos;t go in one order. Buy them one at a time.
        </p>
        <ul className="mt-4 flex flex-col divide-y divide-line rounded-[var(--radius)] border border-line">
          {tickets.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-semibold">
                  {t.quantity} × {t.name}
                </span>
                <span className="text-[12px] text-ink-3">Pay with {t.methods.join(" or ")}</span>
              </span>
              <Link
                href={t.href}
                className="inline-flex min-h-11 shrink-0 items-center rounded-md bg-accent px-3 text-[13px] font-semibold text-white hover:opacity-90"
              >
                Buy these
              </Link>
            </li>
          ))}
        </ul>
        <Link href={editTicketsHref} className="mt-4 inline-flex min-h-11 items-center text-[13px] font-semibold text-accent hover:underline">
          Change tickets
        </Link>
      </div>
    </main>
  );
}
