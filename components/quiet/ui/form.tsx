import * as React from "react";
import { cn } from "@/lib/cn";

/* ──────────────────────────────────────────────────────────────
 * FormField — input with label, supports controlled and uncontrolled.
 * Focus ring matches the Quiet design (accent border + soft halo).
 * ────────────────────────────────────────────────────────────── */
interface FormFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  hint?: string;
  error?: string;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, hint, error, className, id, ...rest }, ref) => {
    const inputId = id ?? `field-${label.toLowerCase().replace(/\W+/g, "-")}`;
    return (
      <label htmlFor={inputId} className={cn("flex flex-col gap-1", className)}>
        <span className="text-label">{label}</span>
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "rounded-md border bg-surface px-3 py-2.5 text-[14px] font-medium",
            "outline-none transition-shadow duration-100",
            "placeholder:text-ink-4",
            error
              ? "border-danger focus:ring-2 focus:ring-danger/20"
              : "border-line-2 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
          )}
          aria-invalid={!!error || undefined}
          aria-describedby={hint || error ? `${inputId}-desc` : undefined}
          {...rest}
        />
        {(hint || error) && (
          <span
            id={`${inputId}-desc`}
            className={cn(
              "font-mono text-[11px]",
              error ? "text-danger" : "text-ink-3"
            )}
          >
            {error ?? hint}
          </span>
        )}
      </label>
    );
  }
);
FormField.displayName = "FormField";

/* ──────────────────────────────────────────────────────────────
 * RadioCard — used for ticket type selection and payment method.
 * Visually distinct from a checkbox; carries label + sublabel + price slot.
 * ────────────────────────────────────────────────────────────── */
interface RadioCardProps
  extends Omit<React.HTMLAttributes<HTMLLabelElement>, "onChange" | "title"> {
  selected: boolean;
  disabled?: boolean;
  name: string;
  value: string;
  onChange?: (value: string) => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Primary line of text */
  title: React.ReactNode;
  /** Mono-styled sub line */
  subtitle?: React.ReactNode;
}

export function RadioCard({
  selected,
  disabled,
  name,
  value,
  onChange,
  leading,
  trailing,
  title,
  subtitle,
  className,
  ...rest
}: RadioCardProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border p-3 transition-colors",
        selected
          ? "border-accent bg-accent-soft"
          : "border-line bg-surface hover:border-line-2",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...rest}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="sr-only"
      />
      <span
        className={cn(
          "relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 bg-surface",
          selected ? "border-accent" : "border-line-2"
        )}
      >
        {selected && (
          <span className="h-2 w-2 rounded-full bg-accent" />
        )}
      </span>
      {leading}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-semibold">{title}</span>
        {subtitle && (
          <span className="font-mono text-[11px] text-ink-3">{subtitle}</span>
        )}
      </div>
      {trailing}
    </label>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Stepper — horizontal numbered progress used by desktop checkout.
 * Matches the QuietDeskCheckout artboard exactly.
 * ────────────────────────────────────────────────────────────── */
export interface Step {
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentIndex: number;
  className?: string;
}

export function Stepper({ steps, currentIndex, className }: StepperProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {steps.map((s, i) => {
        const complete = i < currentIndex;
        const current = i === currentIndex;
        return (
          <React.Fragment key={s.label}>
            <span
              className={cn(
                "inline-flex h-[22px] w-[22px] items-center justify-center rounded-full font-mono text-[11px] font-bold",
                complete || current
                  ? "bg-accent text-white"
                  : "border border-line-2 text-ink-3"
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "font-mono text-[11px] uppercase",
                current
                  ? "font-semibold text-ink"
                  : complete
                  ? "text-ink-3"
                  : "text-ink-3"
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="h-px w-6 bg-line" />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * QuantityStepper — minus/plus pair around a count, used in checkout.
 * Accessible: announces value changes, disables at bounds.
 * ────────────────────────────────────────────────────────────── */
import { Icon } from "@/components/quiet/ui/icon";

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label = "Quantity",
}: QuantityStepperProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line-2 bg-surface hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Decrease"
      >
        <Icon name="minus" size={14} />
      </button>
      <span
        className="min-w-[20px] text-center font-mono text-[16px] font-semibold tabular-nums"
        aria-live="polite"
        aria-atomic="true"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-ink bg-ink text-white hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Increase"
      >
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}
