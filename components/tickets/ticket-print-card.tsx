import * as React from "react";
import { TicketQrCode } from "@/components/tickets/ticket-qr-code";
import type { TicketViewProp } from "@/lib/mappers/tickets";

/* ──────────────────────────────────────────────────────────────
 * Printable ticket — a landscape "festival stub" strip.
 *
 * The event cover fills the left with the details over a dark fade;
 * a dashed tear line with notches separates the white QR stub on the
 * right. Printed at the top of an A4 page (190 × 72 mm) so it can be
 * cut out along the edges.
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
  const where = [ticket.venueName, ticket.venueAddress].filter(Boolean).join(" · ");

  return (
    <div
      ref={ref}
      id={TICKET_PRINT_ID}
      aria-hidden
      className="hidden h-[72mm] w-[190mm] overflow-hidden rounded-[4mm] border border-line-2 bg-white text-ink [print-color-adjust:exact] [-webkit-print-color-adjust:exact] print:flex"
    >
      {/* Cover + details */}
      <div className="relative min-w-0 flex-1 bg-ink">
        <img src={ticket.eventPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,12,0.92)_0%,rgba(10,10,12,0.72)_50%,rgba(10,10,12,0.15)_88%)]" />
        <div className="relative flex h-full flex-col justify-between p-[7mm] text-white">
          <div className="font-mono text-[7pt] tracking-[0.14em] opacity-80">TICKETIV · ADMIT ONE</div>
          <div className="max-w-[95mm]">
            <div className="line-clamp-2 text-[24pt] font-black uppercase leading-[0.95]">
              {ticket.eventTitle}
            </div>
            <div className="mt-[2.5mm] font-mono text-[10pt] font-bold">{when}</div>
            {where && <div className="mt-[1mm] font-mono text-[8pt] uppercase opacity-85">{where}</div>}
          </div>
          <div className="flex gap-[10mm]">
            {ticket.holderName && <StripField label="Holder" value={ticket.holderName} />}
            <StripField label="Ticket" value={ticket.typeLabel} />
          </div>
        </div>
      </div>

      {/* Tear line with notches */}
      <div className="relative w-0 border-l-2 border-dashed border-line-2">
        <span className="absolute -left-[3mm] -top-[3mm] h-[6mm] w-[6mm] rounded-full border border-line-2 bg-white" />
        <span className="absolute -bottom-[3mm] -left-[3mm] h-[6mm] w-[6mm] rounded-full border border-line-2 bg-white" />
      </div>

      {/* QR stub */}
      <div className="flex w-[56mm] shrink-0 flex-col items-center justify-center gap-[2.5mm]">
        <div className="text-[6.5pt] font-medium uppercase tracking-[0.08em] text-ink-3">
          {ticket.isValid ? "Scan at gate" : "Not valid for entry"}
        </div>
        {ticket.isValid ? (
          <TicketQrCode
            value={ticket.qrCode}
            label={`Ticket QR code for ${ticket.eventTitle}`}
            size={512}
            className="w-[42mm] rounded-[2.5mm] border border-line p-[2mm] [&_svg]:h-auto [&_svg]:w-full"
          />
        ) : (
          <div className="h-[42mm] w-[42mm] rounded-[2.5mm] border border-dashed border-line-2" />
        )}
        <div className="font-mono text-[7.5pt] text-ink-3">
          #{ticket.orderNumber}
          {ticket.isValid ? ` · ${shortTicketCode(ticket.qrCode)}` : ""}
        </div>
      </div>
    </div>
  );
});

function StripField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[6pt] tracking-[0.1em] uppercase opacity-65">{label}</div>
      <div className="max-w-[60mm] truncate text-[10.5pt] font-bold">{value}</div>
    </div>
  );
}
