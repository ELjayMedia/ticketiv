import * as React from "react";
import { cn } from "@/lib/cn";

type ChipVariant = "default" | "active" | "accent" | "muted";
type ChipSize = "sm" | "md";

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  size?: ChipSize;
  as?: "span" | "button";
  onClick?: React.MouseEventHandler;
}

const base =
  "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap " +
  "transition-colors duration-150";

const sizes: Record<ChipSize, string> = {
  sm: "px-2.5 py-1 text-[11px]",
  md: "px-3 py-1.5 text-[13px]",
};

const variants: Record<ChipVariant, string> = {
  default:
    "border border-line bg-surface text-ink-2 hover:border-line-2",
  active: "bg-ink text-surface border border-ink",
  accent: "bg-accent-soft text-accent border border-transparent",
  muted: "bg-surface-2 text-ink-3 border border-transparent",
};

export function Chip({
  className,
  variant = "default",
  size = "md",
  as,
  onClick,
  ...rest
}: ChipProps) {
  const Element = (as ?? (onClick ? "button" : "span")) as "span" | "button";
  return React.createElement(Element, {
    className: cn(base, sizes[size], variants[variant], onClick && "cursor-pointer", className),
    onClick,
    ...rest,
  });
}
