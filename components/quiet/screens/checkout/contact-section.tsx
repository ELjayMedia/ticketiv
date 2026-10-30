"use client";

import * as React from "react";
import Link from "next/link";
import { FormField } from "@/components/quiet/ui/form";
import { Icon } from "@/components/quiet/ui/icon";

/* ──────────────────────────────────────────────────────────────
 * Checkout contact information — Eventbrite-style.
 *
 * Guests: "Log in for a faster experience" (returns to this exact
 * checkout, hold and cart intact), then first / last name, email and
 * confirm email. Nothing here requires an account.
 * Signed-in buyers: names prefilled, email fixed to the account.
 * ────────────────────────────────────────────────────────────── */

export interface ContactValues {
  firstName: string;
  lastName: string;
  email: string;
  confirmEmail: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function contactErrors(values: ContactValues, isGuest: boolean) {
  const email = values.email.trim();
  return {
    firstName: values.firstName.trim() ? null : "Enter your first name",
    lastName: values.lastName.trim() ? null : "Enter your last name",
    email: EMAIL_RE.test(email) ? null : "Enter a valid email address",
    confirmEmail:
      !isGuest || email.toLowerCase() === values.confirmEmail.trim().toLowerCase()
        ? null
        : "Email addresses don't match",
  };
}

export function isContactComplete(values: ContactValues, isGuest: boolean) {
  return Object.values(contactErrors(values, isGuest)).every((e) => e == null);
}

export function ContactSection({
  values,
  onChange,
  isGuest,
  loginHref,
  disabled,
  showErrors,
  layout = "stack",
  idPrefix,
}: {
  values: ContactValues;
  onChange: (next: ContactValues) => void;
  isGuest: boolean;
  loginHref: string;
  disabled?: boolean;
  /** Reveal field errors (after a submit attempt or on blur). */
  showErrors?: boolean;
  layout?: "stack" | "grid";
  /** Distinguishes fields when mobile and desktop screens share a page. */
  idPrefix: string;
}) {
  const [touched, setTouched] = React.useState<Partial<Record<keyof ContactValues, boolean>>>({});
  const errors = contactErrors(values, isGuest);
  const errorFor = (key: keyof ContactValues) => (showErrors || touched[key] ? errors[key] ?? undefined : undefined);
  const field = (key: keyof ContactValues) => ({
    id: `${idPrefix}-${key}`,
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...values, [key]: e.target.value }),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
    error: errorFor(key),
    disabled,
  });

  return (
    <div className="flex flex-col gap-3">
      {isGuest ? (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-3">
          <Icon name="user" size={16} className="shrink-0 text-ink-3" />
          <p className="flex-1 text-[13px] text-ink-2">
            Have a Ticketiv account?{" "}
            <Link href={loginHref as "/login"} className="font-semibold text-accent hover:underline">
              Log in for a faster experience
            </Link>
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-3">
          <Icon name="check" size={12} className="text-accent" />
          Signed in as {values.email}
        </div>
      )}

      <div className={layout === "grid" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}>
        <FormField label="First name" autoComplete="given-name" {...field("firstName")} />
        <FormField label="Last name" autoComplete="family-name" {...field("lastName")} />
        <FormField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          {...field("email")}
          readOnly={!isGuest}
          hint={isGuest ? "Your tickets will be sent here" : undefined}
        />
        {isGuest && (
          <FormField
            label="Confirm email"
            type="email"
            inputMode="email"
            autoComplete="email"
            {...field("confirmEmail")}
            onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault()}
          />
        )}
      </div>
    </div>
  );
}
