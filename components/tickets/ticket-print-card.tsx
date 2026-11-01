import * as React from "react";
import { TicketQrCode } from "@/components/tickets/ticket-qr-code";
import type { TicketViewProp } from "@/lib/mappers/tickets";

/* ──────────────────────────────────────────────────────────────
 * Printable ticket — A5 portrait, white, no controls.
 *
 * Hidden on screen and shown only by `@media print` (see the style
 * block in TicketView). The same layout is drawn to a PNG by
 * `renderTicketImage` for sharing on WhatsApp / email, and that
 * renderer reads the QR SVG from this card so both always match.
 * ────────────────────────────────────────────────────────────── */

export const TICKET_PRINT_ID = "ticket-print";

export function shortTicketCode(code: string): string {
  return code.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export const TicketPrintCard = React.forwardRef<
  HTMLDivElement,
  { ticket: TicketViewProp }
>(function TicketPrintCard({ ticket }, ref) {
  const when = [ticket.dateLabel.toUpperCase(), ticket.timeLabel].filter(Boolean).join(" · ");
  const where = [ticket.venueName, ticket.venueAddress].filter(Boolean).join(", ");

  return (
    <div
      ref={ref}
      id={TICKET_PRINT_ID}
      aria-hidden
      className="hidden h-[210mm] w-[148mm] flex-col gap-[6mm] bg-white p-[10mm] text-ink print:flex"
    >
      <img
        src={ticket.eventPhoto}
        alt=""
        className="aspect-video w-full rounded-[4mm] object-cover"
      />
      <div>
        <div className="line-clamp-2 text-[26pt] font-extrabold leading-[1.05] tracking-[-0.02em]">
          {ticket.eventTitle}
        </div>
        <div className="mt-[2mm] font-mono text-[10pt] font-semibold text-ink-2">{when}</div>
        {where && (
          <div className="mt-[1mm] font-mono text-[10pt] uppercase text-ink-3">{where}</div>
        )}
      </div>

      <div className="flex items-center gap-[6mm] border-t-2 border-dashed border-line-2 pt-[6mm]">
        {ticket.isValid ? (
          <TicketQrCode
            value={ticket.qrCode}
            label={`Ticket QR code for ${ticket.eventTitle}`}
            size={512}
            className="w-[56mm] shrink-0 rounded-[3mm] border border-line p-[2.5mm] [&_svg]:h-auto [&_svg]:w-full"
          />
        ) : (
          <div className="flex h-[56mm] w-[56mm] shrink-0 items-center justify-center rounded-[3mm] border border-line text-center text-[10pt] text-ink-3">
            Not valid for entry
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-[3mm]">
          {ticket.holderName && <PrintField label="Holder" value={ticket.holderName} />}
          <PrintField label="Ticket" value={ticket.typeLabel} />
          <div className="font-mono text-[9pt] text-ink-3">
            #{ticket.orderNumber}
            {ticket.isValid ? ` · ${shortTicketCode(ticket.qrCode)}` : ""}
          </div>
        </div>
      </div>

      <div className="mt-auto flex items-baseline justify-between text-[8pt] text-ink-3">
        <span>Show this QR at the gate · one entry per ticket</span>
        <span className="font-mono font-semibold text-accent">ticketiv.app</span>
      </div>
    </div>
  );
});

function PrintField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[7.5pt] font-medium uppercase tracking-[0.08em] text-ink-3">{label}</div>
      <div className="line-clamp-2 text-[13pt] font-semibold leading-tight">{value}</div>
    </div>
  );
}
