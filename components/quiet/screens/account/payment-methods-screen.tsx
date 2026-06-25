"use client"

import { useState, useTransition } from "react"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import type { SavedPaymentMethod } from "@/lib/data/attendee/payment-methods"
import {
  removePaymentMethodAction,
  setDefaultPaymentMethodAction,
} from "@/app/(consumer)/me/payment-methods/actions"

function methodIcon(method: SavedPaymentMethod): IconName {
  if (method.methodType?.toLowerCase().includes("momo")) return "globe"
  return "wallet"
}

function methodLabel(method: SavedPaymentMethod): string {
  const brand = method.brand
    ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1)
    : method.methodType?.toLowerCase().includes("momo")
      ? "Mobile money"
      : "Card"
  return method.last4 ? `${brand} •••• ${method.last4}` : brand
}

function expLabel(method: SavedPaymentMethod): string | null {
  if (!method.expMonth || !method.expYear) return null
  const mm = String(method.expMonth).padStart(2, "0")
  const yy = String(method.expYear).slice(-2)
  return `Expires ${mm}/${yy}`
}

export function PaymentMethodsScreen({ methods }: { methods: SavedPaymentMethod[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function onSetDefault(id: string) {
    setError(null)
    setPendingId(id)
    startTransition(async () => {
      const res = await setDefaultPaymentMethodAction(id)
      if (!res.ok) setError(res.error ?? "Something went wrong")
      setPendingId(null)
    })
  }

  function onRemove(id: string) {
    setError(null)
    setPendingId(id)
    startTransition(async () => {
      const res = await removePaymentMethodAction(id)
      if (!res.ok) setError(res.error ?? "Something went wrong")
      setPendingId(null)
    })
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 lg:px-6 lg:py-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Profile</span>
        <h1 className="text-h1">Payment methods</h1>
        <p className="text-[13px] text-ink-3">
          Manage the cards and wallets saved for faster checkout.
        </p>
      </header>

      {error && (
        <p className="flex items-center gap-1.5 font-mono text-[11px] text-danger" role="status">
          <Icon name="close" size={13} />
          {error}
        </p>
      )}

      {methods.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center" flat>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="wallet" size={20} />
          </span>
          <p className="text-[14px] font-semibold text-ink">No saved methods yet</p>
          <p className="max-w-xs text-[13px] text-ink-3">
            When you check out, you can save your card or mobile money so it&apos;s ready next time.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {methods.map((m, i) => {
            const busy = pendingId === m.id
            const exp = expLabel(m)
            return (
              <div
                key={m.id}
                className={
                  "flex items-center gap-3 px-4 py-3.5 " + (i > 0 ? "border-t border-line" : "")
                }
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name={methodIcon(m)} size={16} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
                    <span className="truncate">{methodLabel(m)}</span>
                    {m.isDefault && (
                      <Chip size="sm" variant="accent">
                        Default
                      </Chip>
                    )}
                  </span>
                  {exp && (
                    <span className="font-mono text-[11px] text-ink-3">{exp}</span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {!m.isDefault && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={busy}
                      onClick={() => onSetDefault(m.id)}
                    >
                      Set default
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={busy}
                    onClick={() => onRemove(m.id)}
                    aria-label="Remove payment method"
                    className="text-danger"
                  >
                    <Icon name="trash" size={15} />
                  </Button>
                </div>
              </div>
            )
          })}
        </Card>
      )}

      <p className="text-center font-mono text-[11px] text-ink-3">
        Review payments and receipts under{" "}
        <Link href="/orders" className="text-accent hover:underline">
          Orders
        </Link>
        .
      </p>
    </main>
  )
}
