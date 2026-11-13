import { BrandMark, type BrandProduct } from "@/components/brand/brand-mark"

/** Page-level logo: the app mark beside the display wordmark. */
export function Logo({ className = "", product = "ticketiv" }: { className?: string; product?: BrandProduct }) {
  return (
    <div className={`relative inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark product={product} size={32} />
      <span
        className="font-[family-name:var(--font-display)] text-[1.75rem] leading-none tracking-tight text-[var(--color-ink)]"
        style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}
      >
        Ticketiv
      </span>
      {product === "organizer" ? (
        <span className="self-end pb-0.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">Organizer</span>
      ) : (
        <span aria-hidden className="ml-[-0.25rem] inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-saffron)]" />
      )}
    </div>
  )
}
