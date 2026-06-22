import * as React from "react";
import { cn } from "@/lib/cn";

/* ── Skeleton ─────────────────────────────────────────────────────
 * Pulse-shimmer placeholder shown during loading states.
 *
 * Compose shapes freely:
 *   <Skeleton className="h-4 w-32" />         ← text line
 *   <Skeleton className="h-40 w-full" />       ← card / image block
 *   <Skeleton circle size={40} />              ← avatar
 * ────────────────────────────────────────────────────────────── */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as a perfect circle (avatar / icon placeholder) */
  circle?: boolean;
  /** Side length for circle skeletons; ignored when circle is false */
  size?: number;
}

export function Skeleton({ circle, size, className, style, ...rest }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-line rounded-[var(--radius)]",
        circle && "rounded-full shrink-0",
        className
      )}
      style={{
        ...(circle && size ? { width: size, height: size } : {}),
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    />
  );
}

/* ── SkeletonText — convenience stack of text-line skeletons ─────
 * lines: number of lines (default 3)
 * lastWidth: width of the final line to mimic natural text wrap
 * ────────────────────────────────────────────────────────────── */
interface SkeletonTextProps {
  lines?: number;
  lastWidth?: string;
  className?: string;
}

export function SkeletonText({
  lines = 3,
  lastWidth = "60%",
  className,
}: SkeletonTextProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3 w-full"
          style={i === lines - 1 ? { width: lastWidth } : undefined}
        />
      ))}
    </div>
  );
}

/* ── SkeletonCard — event-card shaped placeholder ────────────── */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-line bg-surface overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      {/* Image block */}
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="p-4 flex flex-col gap-3">
        {/* Category chip */}
        <Skeleton className="h-5 w-20 rounded-full" />
        {/* Title */}
        <Skeleton className="h-4 w-3/4" />
        {/* Sub-line */}
        <Skeleton className="h-3 w-1/2" />
        {/* Footer row */}
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-20 rounded-[var(--radius)]" />
        </div>
      </div>
    </div>
  );
}
