"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/quiet/ui/icon";

/* ── Select / Dropdown ────────────────────────────────────────────
 * Quiet-UI wrapper around Radix Select.
 *
 * Simple usage (uncontrolled):
 *   <Select defaultValue="all">
 *     <SelectOption value="all">All events</SelectOption>
 *     <SelectOption value="active">Active</SelectOption>
 *   </Select>
 *
 * With label / error (mirrors FormField):
 *   <Select label="Status" value={v} onValueChange={setV}>
 *     <SelectOption value="draft">Draft</SelectOption>
 *     <SelectOption value="published">Published</SelectOption>
 *   </Select>
 * ────────────────────────────────────────────────────────────── */

export interface SelectProps {
  /** Controlled value */
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  /** "sm" | "md" (default) */
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}

export function Select({
  value,
  onValueChange,
  defaultValue,
  placeholder = "Select…",
  label,
  hint,
  error,
  disabled,
  size = "md",
  className,
  children,
}: SelectProps) {
  const inputId = label
    ? `select-${label.toLowerCase().replace(/\W+/g, "-")}`
    : undefined;

  const triggerBase = cn(
    "flex w-full items-center justify-between rounded-md border bg-surface font-medium",
    "transition-shadow duration-100 outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "focus:border-accent focus:ring-[3px] focus:ring-accent-soft",
    error
      ? "border-danger focus:ring-danger/20"
      : "border-line-2 hover:border-line",
    size === "sm" ? "px-2.5 py-1.5 text-[13px] gap-1.5" : "px-3 py-2.5 text-[14px] gap-2",
    className
  );

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-label"
        >
          {label}
        </label>
      )}
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        defaultValue={defaultValue}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger id={inputId} className={triggerBase}>
          <SelectPrimitive.Value placeholder={<span className="text-ink-4">{placeholder}</span>} />
          <SelectPrimitive.Icon asChild>
            <Icon name="chevD" size={16} className="shrink-0 text-ink-3" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className={cn(
              "z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden",
              "rounded-[var(--radius-md)] border border-line bg-surface shadow-[var(--shadow-card)]",
              "data-[state=open]:animate-[fadeIn_120ms_ease]",
              "data-[state=closed]:animate-[fadeOut_80ms_ease]"
            )}
          >
            <SelectPrimitive.Viewport className="p-1">
              {children}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {(hint || error) && (
        <span
          className={cn(
            "font-mono text-[11px]",
            error ? "text-danger" : "text-ink-3"
          )}
        >
          {error ?? hint}
        </span>
      )}
    </div>
  );
}

/* ── SelectOption ──────────────────────────────────────────────── */
interface SelectOptionProps {
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function SelectOption({ value, disabled, children }: SelectOptionProps) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2",
        "rounded-md px-3 py-2 text-[14px] text-ink outline-none",
        "data-[highlighted]:bg-surface-2 data-[highlighted]:text-ink",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
      )}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ml-auto">
        <Icon name="check" size={14} className="text-accent" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

/* ── SelectGroup + SelectGroupLabel ───────────────────────────── */
export const SelectGroup = SelectPrimitive.Group;

export function SelectGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <SelectPrimitive.Label className="px-3 pb-1 pt-2 font-mono text-[11px] uppercase tracking-wider text-ink-3">
      {children}
    </SelectPrimitive.Label>
  );
}

export const SelectSeparator = () => (
  <SelectPrimitive.Separator className="my-1 h-px bg-line" />
);
