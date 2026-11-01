import { Icon } from "@/components/quiet/ui/icon"

export function FieldHelpTooltip({ text }: { text?: string }) {
  if (!text) return null

  return (
    <span className="group relative inline-flex">
      <Icon name="info" className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
      <span className="pointer-events-none absolute left-1/2 top-5 z-30 hidden w-64 -translate-x-1/2 rounded-xl border bg-surface p-3 text-xs font-normal leading-5 text-ink shadow-md group-hover:block">
        {text}
      </span>
    </span>
  )
}
