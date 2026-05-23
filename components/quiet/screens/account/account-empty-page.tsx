import Link from "next/link";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Card } from "@/components/quiet/ui/card";

interface AccountEmptyPageProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: IconName;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  bullets?: string[];
}

export function AccountEmptyPage({
  eyebrow,
  title,
  description,
  icon,
  primaryHref = "/me",
  primaryLabel = "Back to account",
  secondaryHref = "/",
  secondaryLabel = "Discover events",
  bullets = [],
}: AccountEmptyPageProps) {
  return (
    <div className="mx-auto max-w-[480px] bg-bg pb-24">
      <div className="h-14" />

      <header className="px-5 pb-4 pt-2">
        <Link
          href="/me"
          className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
          aria-label="Back to account"
        >
          <Icon name="chevL" size={20} />
        </Link>
        <div className="text-label">{eyebrow}</div>
        <h1 className="text-h1 mt-1">{title}</h1>
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-ink-3">
          {description}
        </p>
      </header>

      <section className="px-5">
        <Card className="p-5 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name={icon} size={22} />
          </div>
          <div className="mt-4 text-[15px] font-semibold">Nothing here yet</div>
          <p className="mx-auto mt-1.5 max-w-[320px] font-mono text-[11px] leading-relaxed text-ink-3">
            This section is ready for the next phase of the attendee journey. Once activity exists, it will appear here with clear status labels and actions.
          </p>

          {bullets.length > 0 && (
            <div className="mt-4 rounded-[var(--radius)] border border-line bg-bg p-3 text-left">
              <div className="text-label mb-2">This area will show</div>
              <ul className="space-y-1.5 font-mono text-[11px] text-ink-3">
                {bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center rounded-[var(--radius)] bg-ink px-3 py-2 text-[12px] font-semibold text-white hover:bg-ink-2"
            >
              {primaryLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="inline-flex items-center justify-center rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold hover:bg-bg"
            >
              {secondaryLabel}
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
