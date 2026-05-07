export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <span
        className="font-[family-name:var(--font-display)] text-[1.75rem] leading-none tracking-tight text-[var(--color-ink)]"
        style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}
      >
        Ticketiv
      </span>
      <span
        aria-hidden
        className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-saffron)]"
      />
    </div>
  )
}
