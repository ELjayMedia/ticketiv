"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Card, CardBody } from "@/components/quiet/ui/card";
import { Chip } from "@/components/quiet/ui/chip";
import { Icon } from "@/components/quiet/ui/icon";
import { LiveDot } from "@/components/quiet/ui/primitives";
import type { DoorLiveSummary, ScannerState } from "@/lib/organizer/door-live";

const REFRESH_MS = 15_000;

const SCANNER_CHIP: Record<ScannerState, { label: string; variant: "accent" | "default" | "muted"; className: string }> = {
  online: { label: "Online", variant: "accent", className: "bg-success-soft text-success" },
  quiet: { label: "Quiet", variant: "default", className: "bg-warning-soft text-warning" },
  offline: { label: "Offline", variant: "muted", className: "bg-danger-soft text-danger" },
};

function clock(iso: string | null, timeZone: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(iso));
}

function sinceLabel(iso: string | null, nowMs: number) {
  if (!iso) return "No scans yet";
  const min = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60000));
  return min === 0 ? "Last scan just now" : `Last scan ${min} min ago`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-1 p-4">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</span>
        <span className="font-mono text-[22px] font-semibold tabular-nums">{value}</span>
        {sub ? <span className="text-[12px] text-ink-3">{sub}</span> : null}
      </CardBody>
    </Card>
  );
}

/**
 * Door-day control view: sold vs entered, entry pace, each entrance, scanner
 * health and scan problems that need a person. Refreshes itself while open;
 * all numbers come from the scans the door already records.
 */
export function DoorLiveView({
  summary,
  eventTitle,
  timeZone,
  nowMs,
  backHref,
  scannerHref,
  autoRefresh = true,
}: {
  summary: DoorLiveSummary;
  eventTitle: string;
  timeZone: string;
  nowMs: number;
  backHref: string;
  scannerHref: string;
  autoRefresh?: boolean;
}) {
  const router = useRouter();
  React.useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [autoRefresh, router]);

  const offline = summary.scanners.filter((s) => s.state === "offline").length;
  const stalled = summary.entrances.filter((e) => e.stalled);
  const outside = Math.max(0, summary.sold - summary.entered);

  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Link href={backHref} className="mb-1 inline-flex w-fit items-center gap-1 text-[12px] font-medium text-ink-3 hover:text-ink">
              <Icon name="chevL" size={13} /> Event
            </Link>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent">
              <LiveDot /> Door live
            </span>
            <h1 className="text-h1">{eventTitle}</h1>
            <span className="text-[13px] text-ink-3">
              {sinceLabel(summary.lastScanAt, nowMs)} · updates every 15 seconds
            </span>
          </div>
          <Link
            href={scannerHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-line-2 bg-surface px-4 text-[13px] font-semibold hover:bg-bg"
          >
            <Icon name="qr" size={14} /> Open scanner
          </Link>
        </div>

        {offline > 0 || stalled.length > 0 ? (
          <div role="status" className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-warning/25 bg-warning-soft px-4 py-3">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-warning" />
            <span className="text-[13px] leading-relaxed text-ink-2">
              {[
                stalled.length > 0 ? `${stalled.map((e) => e.name).join(", ")} ${stalled.length === 1 ? "has" : "have"} had no entries for 10 minutes while others are moving.` : null,
                offline > 0 ? `${offline} scanner${offline === 1 ? " is" : "s are"} offline. Scans made offline sync when they reconnect.` : null,
              ]
                .filter(Boolean)
                .join(" ")}
            </span>
          </div>
        ) : null}

        <section className="flex flex-col gap-3">
          <Card>
            <CardBody className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[15px] font-semibold">
                  {summary.entered.toLocaleString("en-SZ")} in of {summary.sold.toLocaleString("en-SZ")} sold
                </span>
                <span className="font-mono text-[13px] font-semibold tabular-nums text-ink-2">
                  {summary.enteredPct === null ? "—" : `${summary.enteredPct}%`}
                </span>
              </div>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-label="Ticket holders inside"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={summary.enteredPct ?? 0}
              >
                <div className="h-full rounded-full bg-accent" style={{ width: `${summary.enteredPct ?? 0}%` }} />
              </div>
            </CardBody>
          </Card>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Inside" value={summary.entered.toLocaleString("en-SZ")} />
            <Stat label="Still to arrive" value={outside.toLocaleString("en-SZ")} />
            <Stat label="Entries / min" value={summary.perMinute.toFixed(1)} sub="last 15 min" />
            <Stat
              label="Problems"
              value={summary.problems.length.toLocaleString("en-SZ")}
              sub="last hour"
            />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="flex flex-col gap-2.5">
            <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Entrances</h2>
            <Card className="overflow-hidden">
              {summary.entrances.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-ink-3">No scans yet. Entrances appear as soon as scanners start.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {summary.entrances.map((e) => (
                    <li key={e.name} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-2 text-[14px] font-semibold">
                          {e.name}
                          {e.stalled ? <Chip size="sm" className="bg-warning-soft text-warning">No entries 10 min</Chip> : null}
                        </span>
                        <span className="font-mono text-[11px] text-ink-3">
                          Last entry {clock(e.lastScanAt, timeZone)}
                          {e.problems > 0 ? ` · ${e.problems} problem${e.problems === 1 ? "" : "s"}` : ""}
                        </span>
                      </span>
                      <span className="flex flex-col items-end">
                        <span className="font-mono text-[16px] font-semibold tabular-nums">{e.entered.toLocaleString("en-SZ")}</span>
                        <span className="font-mono text-[11px] text-ink-3">{e.perMinute.toFixed(1)}/min</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.01em]">Needs attention</h2>
            <Card className="overflow-hidden">
              {summary.problems.length === 0 ? (
                <p className="flex items-center gap-2 px-4 py-4 text-[13px] text-ink-3">
                  <Icon name="checkCircle" size={15} className="text-success" /> No scan problems in the last hour.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {summary.problems.map((p, i) => (
                    <li key={`${p.at}-${i}`} className="flex flex-col gap-0.5 px-4 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{p.label}</span>
                        <span className="font-mono text-[11px] text-ink-3">
                          {p.gate} · {clock(p.at, timeZone)}
                          {p.codeHint ? ` · …${p.codeHint}` : ""}
                        </span>
                      </span>
                      <span className="text-[13px] leading-relaxed text-ink-2">{p.advice}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section className="flex flex-col gap-2.5">
            <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Scanners</h2>
            <Card className="overflow-hidden">
              {summary.scanners.length === 0 ? (
                <p className="px-4 py-4 text-[13px] text-ink-3">No scanners paired to this event yet.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {summary.scanners.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                      <Icon name="qr" size={15} className="shrink-0 text-ink-3" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[14px] font-semibold">{s.label}</span>
                        <span className="font-mono text-[11px] text-ink-3">Seen {clock(s.lastSeenAt, timeZone)}</span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${SCANNER_CHIP[s.state].className}`}>
                        {SCANNER_CHIP[s.state].label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            {summary.problemCounts.length > 0 ? (
              <Card>
                <CardBody className="flex flex-col gap-2 p-4">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Problems by type · last hour</span>
                  {summary.problemCounts.map((c) => (
                    <div key={c.label} className="flex items-center justify-between text-[13px]">
                      <span>{c.label}</span>
                      <span className="font-mono font-semibold tabular-nums">{c.count}</span>
                    </div>
                  ))}
                </CardBody>
              </Card>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
