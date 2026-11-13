import { cn } from "@/lib/cn"

/**
 * The Ticketiv app marks, shared with the Android apps (scripts/brand/mark.mjs).
 * "ticketiv" is the attendee app; "organizer" is Ticketiv Organizer, used
 * wherever an organiser, their staff or scanners work.
 */
export type BrandProduct = "ticketiv" | "organizer"

export const BRAND_NAME: Record<BrandProduct, string> = {
  ticketiv: "Ticketiv",
  organizer: "Ticketiv Organizer",
}

export function BrandMark({
  product = "ticketiv",
  size = 22,
  className,
}: {
  product?: BrandProduct
  size?: number
  className?: string
}) {
  return (
    <img
      src={`/brand/${product}-mark.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={cn("shrink-0 rounded-[22%]", className)}
    />
  )
}

/** Mark plus name, e.g. in a header. The organiser lockup adds "Organizer". */
export function BrandLockup({
  product = "ticketiv",
  size = 22,
  className,
  textClassName = "text-[15px]",
}: {
  product?: BrandProduct
  size?: number
  className?: string
  textClassName?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark product={product} size={size} />
      <span className={cn("font-semibold tracking-tight text-ink", textClassName)}>
        Ticketiv
        {product === "organizer" ? <span className="font-medium text-ink-3"> Organizer</span> : null}
      </span>
    </span>
  )
}
