"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { LOCALES } from "@/lib/i18n/locales"
import { setLocaleAction, type ActionResult } from "@/app/(consumer)/me/language/actions"

export function LanguageScreen({ current }: { current: string }) {
  const [selected, setSelected] = useState(current)
  const [result, setResult] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  function onSave() {
    setResult(null)
    startTransition(async () => {
      setResult(await setLocaleAction(selected))
    })
  }

  const dirty = selected !== current

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 lg:px-6 lg:py-10">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Profile</span>
        <h1 className="text-h1">Language</h1>
        <p className="text-[13px] text-ink-3">
          Choose your preferred language. English is fully translated — others are rolling out.
        </p>
      </header>

      <Card className="overflow-hidden p-0">
        {LOCALES.map((locale, i) => {
          const active = selected === locale.code
          return (
            <button
              key={locale.code}
              type="button"
              onClick={() => {
                setSelected(locale.code)
                setResult(null)
              }}
              className={
                "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bg " +
                (i > 0 ? "border-t border-line " : "")
              }
            >
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
                  {locale.native}
                  {!locale.available && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                      coming soon
                    </span>
                  )}
                </span>
                {locale.native !== locale.label && (
                  <span className="font-mono text-[11px] text-ink-3">{locale.label}</span>
                )}
              </span>
              <span
                className={
                  "inline-flex h-5 w-5 items-center justify-center rounded-full border " +
                  (active ? "border-accent bg-accent text-white" : "border-line-2 text-transparent")
                }
              >
                <Icon name="check" size={13} />
              </span>
            </button>
          )
        })}
      </Card>

      <div className="flex items-center justify-between gap-3">
        {result ? (
          <p
            className={
              "flex items-center gap-1.5 font-mono text-[11px] " +
              (result.ok ? "text-accent" : "text-danger")
            }
            role="status"
          >
            <Icon name={result.ok ? "check" : "close"} size={13} />
            {result.ok ? "Saved" : result.error ?? "Something went wrong"}
          </p>
        ) : (
          <span />
        )}
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={pending || !dirty}
          onClick={onSave}
        >
          {pending ? "Saving…" : "Save language"}
        </Button>
      </div>
    </main>
  )
}
