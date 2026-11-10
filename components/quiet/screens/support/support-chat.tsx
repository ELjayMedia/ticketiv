"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { chatwootSdkUrl, type ChatwootWidgetConfig } from "@/lib/support/chatwoot-widget-core"

declare global {
  interface Window {
    chatwootSDK?: {
      run: (options: { websiteToken: string; baseUrl: string }) => void
    }
    chatwootSettings?: Record<string, unknown>
    $chatwoot?: {
      toggle: (state?: "open" | "close") => void
      setConversationCustomAttributes?: (attributes: Record<string, string>) => void
    }
  }
}

const SCRIPT_ID = "ticketiv-chatwoot-sdk"

export function SupportChat({ config }: { config: ChatwootWidgetConfig | null }) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const openWhenReady = useRef(false)

  const openChat = useCallback(() => {
    if (window.$chatwoot) {
      window.$chatwoot.toggle("open")
      return
    }
    openWhenReady.current = true
  }, [])

  useEffect(() => {
    if (!config) return

    const onReady = () => {
      setReady(true)
      setFailed(false)
      window.$chatwoot?.setConversationCustomAttributes?.({ source: "ticketiv_support_page" })
      if (openWhenReady.current) {
        openWhenReady.current = false
        window.$chatwoot?.toggle("open")
      }
    }
    const onError = () => setFailed(true)

    window.addEventListener("chatwoot:ready", onReady)
    window.addEventListener("chatwoot:error", onError)
    window.chatwootSettings = {
      hideMessageBubble: true,
      position: "right",
      locale: "en",
      useBrowserLanguage: false,
      darkMode: "auto",
      enableFileUpload: true,
      enableEmojiPicker: true,
      enableEndConversation: true,
    }

    const run = () => window.chatwootSDK?.run(config)
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (window.$chatwoot) onReady()
    else if (window.chatwootSDK) run()
    else if (existing) existing.addEventListener("load", run, { once: true })
    else {
      const script = document.createElement("script")
      script.id = SCRIPT_ID
      script.src = chatwootSdkUrl(config)
      script.async = true
      script.defer = true
      script.addEventListener("load", run, { once: true })
      script.addEventListener("error", onError, { once: true })
      document.body.appendChild(script)
    }

    return () => {
      window.removeEventListener("chatwoot:ready", onReady)
      window.removeEventListener("chatwoot:error", onError)
      existing?.removeEventListener("load", run)
    }
  }, [config])

  if (!config || failed) {
    return (
      <div className="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-ink-2" role="status">
        Live chat is temporarily unavailable. Email support instead and we will route the request to the same team.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon name="bell" size={18} />
        </span>
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Chat with Ticketiv support</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
            Your message opens a case in Chatwoot for the Ticketiv super-admin support team.
          </p>
        </div>
      </div>
      <Button type="button" variant="accent" size="md" onClick={openChat}>
        {ready ? "Start support chat" : "Open support chat"}
        <Icon name="arrowR" size={14} />
      </Button>
    </div>
  )
}
