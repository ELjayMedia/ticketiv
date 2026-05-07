"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
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
    if (!user) { setBusy(false); router.push("/sign-in"); return }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("user_id", user.id)
    if (profileErr) {
      // profiles may use 'id' as PK depending on schema version
      await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("id", user.id)
    }

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
    availability === "available" ? "text-[var(--color-forest)]" :
    ["taken", "invalid", "reserved"].includes(availability) ? "text-[var(--color-saffron-deep)]" :
    "text-[var(--color-ink-mute)]"

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">Handle</span>
        <div className="flex items-stretch rounded-[var(--radius-soft)] border border-[var(--color-paper-line)] bg-white/40 focus-within:border-[var(--color-saffron)]">
          <span className="flex items-center border-r border-[var(--color-paper-line)] px-3 text-sm font-[family-name:var(--font-display)] text-[var(--color-ink-soft)]">
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
            className="w-full bg-transparent px-3 py-3 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-mute)] focus:outline-none"
            required
          />
        </div>
        <span className={`text-xs ${helperTone}`}>{helperText}</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.16em] text-[var(--color-ink-mute)]">Display name</span>
        <input
          type="text"
          autoComplete="name"
          placeholder="Lethu Dlamini"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          className="w-full rounded-[var(--radius-soft)] border border-[var(--color-paper-line)] bg-white/40 px-3 py-3 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-mute)] focus:border-[var(--color-saffron)] focus:outline-none"
          required
        />
        <span className="text-xs text-[var(--color-ink-mute)]">
          What friends see when you share tickets or RSVP.
        </span>
      </label>

      {error && (
        <p role="alert" className="rounded-[var(--radius-soft)] border border-[var(--color-saffron)] bg-[var(--color-saffron)]/10 px-3 py-2 text-sm text-[var(--color-ink)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || availability !== "available" || !displayName.trim()}
        className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-ink)] px-6 text-[15px] font-medium text-[var(--color-cream)] transition-colors hover:bg-[var(--color-forest-deep)] disabled:cursor-not-allowed disabled:bg-[var(--color-ink-mute)]"
      >
        {busy ? "Saving…" : "Continue"}
      </button>
    </form>
  )
}
