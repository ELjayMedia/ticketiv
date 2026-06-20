"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import { createClient } from "@/lib/supabase/client"

const HANDLE_RE = /^[a-z0-9][a-z0-9_]{2,29}$/

type Availability = "idle" | "checking" | "available" | "taken" | "invalid" | "reserved"

export function OnboardingForm({ initialDisplayName }: { initialDisplayName: string }) {
  const router = useRouter()
  const [handle, setHandle] = useState("")
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [availability, setAvailability] = useState<Availability>("idle")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    const cleaned = handle.toLowerCase().trim()
    if (!cleaned) { setAvailability("idle"); return }
    if (!HANDLE_RE.test(cleaned)) { setAvailability("invalid"); return }

    setAvailability("checking")
    debounce.current = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("user_handles")
        .select("handle")
        .eq("handle", cleaned)
        .maybeSingle()
      setAvailability(data ? "taken" : "available")
    }, 300)

    return () => { if (debounce.current) clearTimeout(debounce.current) }
  }, [handle])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cleaned = handle.toLowerCase().trim()
    if (!HANDLE_RE.test(cleaned)) {
      setError("Handles are 3–30 chars: lowercase letters, digits, underscore, starting with a letter or digit.")
      return
    }
    if (!displayName.trim()) {
      setError("Add a display name so friends can find you.")
      return
    }

    setBusy(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); router.push("/login"); return }

    await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("user_id", user.id)

    const { error: handleErr } = await supabase
      .from("user_handles")
      .insert({ user_id: user.id, handle: cleaned })

    setBusy(false)

    if (handleErr) {
      if (handleErr.code === "23505") {
        setAvailability("taken")
        setError("That handle was just taken. Pick another.")
        return
      }
      if (handleErr.code === "23514" || handleErr.message?.toLowerCase().includes("reserved")) {
        setAvailability("reserved")
        setError(`"${cleaned}" is reserved. Pick another.`)
        return
      }
      setError(handleErr.message)
      return
    }

    router.push("/")
    router.refresh()
  }

  const helperText = (() => {
    if (!handle) return "3–30 characters. Letters, digits, underscore. No spaces."
    if (availability === "invalid") return "3–30 chars, lowercase letters / digits / underscore."
    if (availability === "checking") return "Checking…"
    if (availability === "available") return "Available."
    if (availability === "taken") return "Already taken."
    if (availability === "reserved") return "Reserved."
    return ""
  })()

  const helperTone =
    availability === "available" ? "text-success" :
    ["taken", "invalid", "reserved"].includes(availability) ? "text-danger" :
    "text-ink-3"

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1">
        <span className="text-label">Handle</span>
        <div className="flex items-stretch overflow-hidden rounded-md border border-line-2 bg-surface focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft">
          <span className="flex items-center border-r border-line bg-bg px-3 font-mono text-[13px] font-semibold text-ink-3">
            @
          </span>
          <input
            type="text"
            inputMode="text"
            autoComplete="username"
            placeholder="lethu"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            maxLength={30}
            className="w-full bg-transparent px-3 py-2.5 text-[14px] font-medium text-ink placeholder:text-ink-4 focus:outline-none"
            required
          />
        </div>
        <span className={cn("font-mono text-[11px]", helperTone)}>{helperText}</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-label">Display name</span>
        <input
          type="text"
          autoComplete="name"
          placeholder="Lethu Dlamini"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          className="rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink placeholder:text-ink-4 outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
          required
        />
        <span className="font-mono text-[11px] text-ink-3">
          What friends see when you share tickets or RSVP.
        </span>
      </label>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
          <Icon name="close" size={14} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={busy || availability !== "available" || !displayName.trim()}
        block
      >
        {busy ? "Saving…" : "Continue"}
      </Button>
    </form>
  )
}
