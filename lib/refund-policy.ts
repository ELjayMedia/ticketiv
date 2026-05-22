/**
 * Refund policy resolution.
 *
 * `events.refund_policy` is `jsonb` and accepts two shapes:
 *
 *   Preset:  { "kind": "flexible" | "moderate" | "strict" | "none" }
 *   Custom:  { "kind": "custom",
 *              "bands": [{ "hours_before": 48, "refund_bps": 10000 },
 *                        { "hours_before": 24, "refund_bps":  5000 }] }
 *
 * `resolveRefundPolicy()` normalises either shape into a sorted list of bands
 * (largest `hours_before` first). UI code calls `refundQuoteForHoursBefore()`
 * to look up the band that applies at purchase/cancellation time.
 *
 * `refund_bps` is in basis points of the ticket face value (10000 = 100%,
 * 5000 = 50%). Match the schema column comment on events.refund_policy.
 */

export type RefundPolicyKind = "flexible" | "moderate" | "strict" | "none" | "custom";

export interface RefundBand {
  hoursBefore: number;
  refundBps: number;
}

export interface ResolvedRefundPolicy {
  kind: RefundPolicyKind;
  bands: RefundBand[];
  label: string;
}

const PRESETS: Record<Exclude<RefundPolicyKind, "custom">, { label: string; bands: RefundBand[] }> = {
  flexible: {
    label: "Flexible",
    bands: [
      { hoursBefore: 24, refundBps: 10000 },
      { hoursBefore: 2, refundBps: 5000 },
    ],
  },
  moderate: {
    label: "Moderate",
    bands: [
      { hoursBefore: 72, refundBps: 10000 },
      { hoursBefore: 24, refundBps: 5000 },
    ],
  },
  strict: {
    label: "Strict",
    bands: [{ hoursBefore: 168, refundBps: 10000 }],
  },
  none: {
    label: "Non-refundable",
    bands: [],
  },
};

const FALLBACK: ResolvedRefundPolicy = {
  kind: "moderate",
  label: PRESETS.moderate.label,
  bands: PRESETS.moderate.bands,
};

export function resolveRefundPolicy(raw: unknown): ResolvedRefundPolicy {
  if (!raw || typeof raw !== "object") return FALLBACK;

  const obj = raw as Record<string, unknown>;
  const kind = obj.kind;

  if (typeof kind !== "string") return FALLBACK;

  if (kind === "custom") {
    const bands = Array.isArray(obj.bands) ? obj.bands.flatMap(parseBand) : [];
    return {
      kind: "custom",
      label: "Custom",
      bands: bands.sort((a, b) => b.hoursBefore - a.hoursBefore),
    };
  }

  const preset = PRESETS[kind as Exclude<RefundPolicyKind, "custom">];
  if (!preset) return FALLBACK;

  return { kind: kind as RefundPolicyKind, label: preset.label, bands: preset.bands };
}

function parseBand(value: unknown): RefundBand[] {
  if (!value || typeof value !== "object") return [];
  const obj = value as Record<string, unknown>;
  const hours = Number(obj.hours_before);
  const bps = Number(obj.refund_bps);
  if (!Number.isFinite(hours) || !Number.isFinite(bps)) return [];
  return [{ hoursBefore: hours, refundBps: Math.max(0, Math.min(10000, bps)) }];
}

export function refundQuoteForHoursBefore(policy: ResolvedRefundPolicy, hoursBefore: number) {
  for (const band of policy.bands) {
    if (hoursBefore >= band.hoursBefore) return band;
  }
  return null;
}

export function formatRefundWindow(policy: ResolvedRefundPolicy): string {
  if (policy.bands.length === 0) return "Non-refundable";
  const top = policy.bands[0];
  if (top.refundBps === 10000) {
    return `Full refund up to ${formatHoursBefore(top.hoursBefore)} before`;
  }
  return `Partial refund up to ${formatHoursBefore(top.hoursBefore)} before`;
}

function formatHoursBefore(hours: number): string {
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}
