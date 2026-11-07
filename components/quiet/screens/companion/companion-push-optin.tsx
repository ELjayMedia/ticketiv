"use client";

import * as React from "react";

import { storePushSubscription } from "@/app/(consumer)/waitlist/push-actions";
import { Button } from "@/components/quiet/ui/button";
import { Icon } from "@/components/quiet/ui/icon";
import { enableWaitlistPush, isPushConfigured, isPushSupported } from "@/lib/push/client";

/**
 * "Get reminders on this device": opt this browser in to Web Push for event
 * reminders and official updates. Asks for permission only on tap, and only
 * shows where push works, keys are configured and this device isn't already
 * subscribed.
 */
export function CompanionPushOptIn() {
  const [state, setState] = React.useState<"hidden" | "offer" | "working" | "on" | "error">("hidden");
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!isPushSupported() || !isPushConfigured() || Notification.permission === "denied") return;
      try {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        const existing = registration ? await registration.pushManager.getSubscription() : null;
        if (active) setState(existing && Notification.permission === "granted" ? "hidden" : "offer");
      } catch {
        if (active) setState("offer");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    setState("working");
    const result = await enableWaitlistPush(storePushSubscription);
    if (result.ok) {
      setState("on");
      setMessage("Reminders and updates will reach this device.");
    } else {
      setState("error");
      setMessage(result.message);
    }
  }

  if (state === "hidden") return null;

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface px-3.5 py-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name="bell" size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-semibold">{state === "on" ? "Reminders on" : "Get reminders on this device"}</span>
        <span className="font-mono text-[10px] leading-relaxed text-ink-3">
          {message ?? "The day before, two hours before, and any official update."}
        </span>
      </span>
      {state === "offer" || state === "working" || state === "error" ? (
        <Button type="button" variant="default" size="xs" onClick={() => void enable()} disabled={state === "working"}>
          {state === "working" ? "…" : state === "error" ? "Try again" : "Turn on"}
        </Button>
      ) : null}
    </div>
  );
}
