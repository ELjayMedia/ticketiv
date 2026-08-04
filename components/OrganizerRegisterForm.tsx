"use client"

import { useEffect, useState } from "react"

import { SignInForm } from "@/components/SignInForm"
import { ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY } from "@/lib/auth/organizer-signup"
import { createClient } from "@/lib/supabase/client"

export function OrganizerRegisterForm() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true

    async function checkSession() {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      window.sessionStorage.setItem(
        ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY,
        session?.user ? "1" : "0",
      )

      if (active) setReady(true)
    }

    void checkSession()
    return () => {
      active = false
    }
  }, [])

  if (!ready) {
    return <p className="font-mono text-[11px] text-ink-3">Preparing secure organizer registration…</p>
  }

  return <SignInForm mode="organizer" />
}
