import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";

/* ── Hairline divider ────────────────────────────────────── */
export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

/* ── Avatar (initials fall back, image if provided) ───────── */
interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  label?: string;
  className?: string;
}

export function Avatar({ src, alt, size = 28, label, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-full bg-ink-4 text-white font-semibold ring-2 ring-surface shrink-0",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size > 30 ? 12 : 10,
      }}
    >
      {src ? (
        // unoptimised because Unsplash URLs are remote and we don't want
        // to require an images.remotePatterns config for the scaffold
        <Image
          src={src}
          alt={alt ?? ""}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        label
      )}
    </span>
  );
}

/* ── Avatar stack (overlapping circles) ───────────────────── */
export function AvatarStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex [&>*]:-ml-2 [&>*:first-child]:ml-0", className)}>
      {children}
    </div>
  );
}

/* ── Photo block with optional overlay + gradient ─────────── */
interface PhotoProps {
  src: string;
  alt?: string;
  className?: string;
  /** "dim" applies a subtle bottom-to-transparent gradient, "heavy" a stronger one */
  overlay?: "none" | "dim" | "heavy";
  /** explicit height in px or any CSS value via style */
  height?: number | string;
  aspectRatio?: string;
  rounded?: boolean;
  children?: React.ReactNode;
}

export function Photo({
  src,
  alt = "",
  className,
  overlay = "none",
  height,
  aspectRatio,
  rounded,
  children,
}: PhotoProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-ink",
        rounded && "rounded-[var(--radius-lg)]",
        className
      )}
      style={{ height, aspectRatio }}
    >
      { }
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover"
      />
      {overlay !== "none" && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0",
            overlay === "dim" &&
              "bg-gradient-to-b from-transparent from-30% to-black/60",
            overlay === "heavy" &&
              "bg-gradient-to-b from-black/5 to-black/75"
          )}
        />
      )}
      {children && (
        <div className="absolute inset-0 z-[2] flex flex-col justify-end p-4 text-white">
          {children}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Segmented — tab-like row of mutually exclusive options.
 * Used by MyTickets (Upcoming/Past/Transfers), Calendar (Month/Week/List),
 * Friends (Activity/Friends/Requests).
 *
 * Pure presentational — caller controls state.
 * ────────────────────────────────────────────────────────────── */
interface SegmentedProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: React.ReactNode }>;
  value: T;
  onChange: (next: T) => void;
  className?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex w-full rounded-[var(--radius-md)] bg-line/40 p-1",
        className
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-center text-[12px] font-medium transition-colors",
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-3 hover:text-ink"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * LiveDot — pulsing accent dot for "live now / in N days" badges.
 * ────────────────────────────────────────────────────────────── */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-2 w-2 shrink-0",
        className
      )}
      aria-hidden
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
 * QRPattern — placeholder QR rendered as deterministic SVG.
 *
 * NOT a real QR encoder — the real one is wired into the ticket
 * view via the Supabase signed-URL endpoint (see TICK-12). This is
 * the static visual for /dev/preview and for the empty/loading state.
 *
 * Deterministic from the `seed` string so the same ticket always
 * shows the same pattern in mocks.
 * ────────────────────────────────────────────────────────────── */
interface QRPatternProps {
  size?: number;
  seed?: string;
  className?: string;
}

export function QRPattern({
  size = 150,
  seed = "ticketiv",
  className,
}: QRPatternProps) {
  // Tiny deterministic PRNG seeded by string
  const rng = mulberry32(hashString(seed));
  const cells = 21;
  const cellPx = size / cells;
  const pattern: boolean[][] = Array.from({ length: cells }, () =>
    Array.from({ length: cells }, () => rng() > 0.5)
  );

  // Three corner finders
  const setFinder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const onBorder = i === 0 || i === 6 || j === 0 || j === 6;
        const onInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        pattern[r + i][c + j] = onBorder || onInner;
      }
    }
    // Clear ring
    for (let i = 1; i < 6; i++) {
      for (let j = 1; j < 6; j++) {
        if (i !== 0 && i !== 6 && j !== 0 && j !== 6) {
          if (!(i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
            pattern[r + i][c + j] = false;
          }
        }
      }
    }
  };
  setFinder(0, 0);
  setFinder(0, cells - 7);
  setFinder(cells - 7, 0);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label="QR code (preview)"
    >
      {pattern.flatMap((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellPx}
              y={r * cellPx}
              width={cellPx + 0.5}
              height={cellPx + 0.5}
              fill="currentColor"
            />
          ) : null
        )
      )}
    </svg>
  );
}

function hashString(s: string): number {
  let h = 1779033703;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
