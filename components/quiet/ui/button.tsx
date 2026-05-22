import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "primary" | "accent" | "ghost" | "outline";
type Size = "xs" | "sm" | "md";

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap " +
  "rounded-[var(--radius)] leading-none transition-colors duration-150 " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const variants: Record<Variant, string> = {
  default: "bg-surface text-ink border border-line-2 hover:bg-bg",
  primary:
    "bg-ink text-surface border border-ink hover:bg-ink-2 active:bg-ink-2",
  accent:
    "bg-accent text-white border border-accent hover:opacity-90 active:opacity-100",
  ghost:
    "bg-transparent text-ink border border-transparent hover:bg-line/60",
  outline:
    "bg-transparent text-ink border border-line-2 hover:bg-bg",
};

const sizes: Record<Size, string> = {
  xs: "px-2.5 py-1 text-xs",
  sm: "px-3 py-1.5 text-[13px]",
  md: "px-4 py-2.5 text-sm",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", block, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        block && "flex w-full",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
