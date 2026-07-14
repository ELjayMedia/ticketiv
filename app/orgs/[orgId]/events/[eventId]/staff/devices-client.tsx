"use client"

import { useState } from "react"
import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { createClientSupabaseClient } from "@/lib/supabase-client"

// TICK-56 — Device registration and event assignment

export type DeviceRow = {
  id: string
  label: string
  device_role: string
  max_scans_per_minute: number | null
  last_seen_at: string | null
}

const DEVICE_ROLES = [
  { value: "organizer_scanner", label: "Scanner" },
  { value: "organizer_pos", label: "Point of Sale" },
  { value: "organizer_kiosk", label: "Self-check kiosk" },
]

function fmtRelative(d: string | null) {
  if (!d) return "Never"
  const diff = Date.now() - new Date(d).getTime()
  if (diff < 60_000) return "Just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "short" }).format(new Date(d))
}

const selectClass =
  "rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

export function DevicesClient({
  orgId,
  eventId,
  canManage,
  initialDevices,
}: {
  orgId: string
  eventId: string
  canManage: boolean
  initialDevices: DeviceRow[]
}) {
  const [devices, setDevices] = useState<DeviceRow[]>(initialDevices)
  const [addOpen, setAddOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [deviceRole, setDeviceRole] = useState("organizer_scanner")
  const [maxScans, setMaxScans] = useState("60")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [removing, setRemoving] = useState<string | null>(null)
  const [setupCode, setSetupCode] = useState<{ code: string; expiresAt: string; label: string } | null>(null)

  async function createSetupCode() {
    if (!label.trim()) {
      setError("Device label is required")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}/devices/setup-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          deviceRole,
          maxScansPerMinute: maxScans ? parseInt(maxScans, 10) : null,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Failed to create setup code")

      setSetupCode({ code: data.code, expiresAt: data.expiresAt, label: data.label })
      setLabel("")
      setDeviceRole("organizer_scanner")
      setMaxScans("60")
    } catch (e: any) {
      setError(e?.message ?? "Failed to create setup code")
    } finally {
      setSubmitting(false)
    }
  }

  async function removeDevice(deviceId: string) {
    if (!confirm("Remove this device? It will no longer be able to scan for this event.")) return
    setRemoving(deviceId)
    try {
      const supabase = createClientSupabaseClient()
      const { error: dbError } = await supabase!
        .from("devices")
        .update({ event_id: null })
        .eq("id", deviceId)
        .eq("org_id", orgId)

      if (dbError) throw dbError
      setDevices((prev) => prev.filter((d) => d.id !== deviceId))
    } catch (e: any) {
      setError(e?.message ?? "Failed to remove device")
    } finally {
      setRemoving(null)
    }
  }

  return (
    <Card>
      <CardBody className="flex items-center justify-between px-5 py-4">
        <p className="text-label">
          Devices ({devices.length})
        </p>
        {canManage && !addOpen && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setAddOpen(true); setError(""); setSetupCode(null) }}
          >
            <Icon name="plus" size={14} />
            Setup code
          </Button>
        )}
      </CardBody>

      {addOpen && canManage && (
        <>
          <CardDivider />
          <CardBody className="flex flex-col gap-3 p-5">
            <p className="text-h3">Create setup code</p>
            <FormField
              label="Label *"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Gate A Scanner"
              autoFocus
            />
            <label className="flex flex-col gap-1">
              <span className="text-label">Device role</span>
              <select
                value={deviceRole}
                onChange={(e) => setDeviceRole(e.target.value)}
                className={selectClass}
              >
                {DEVICE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </label>
            <FormField
              label="Max scans per minute"
              type="number"
              value={maxScans}
              onChange={(e) => setMaxScans(e.target.value)}
              placeholder="60"
              min="1"
              max="600"
            />
            {error && (
              <p className="rounded-[var(--radius-sm)] border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] text-danger">
                {error}
              </p>
            )}
            {setupCode && (
              <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-accent/30 bg-accent-soft p-3">
                <span className="text-label">Setup code</span>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[24px] font-semibold tracking-wider text-ink">{setupCode.code}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard?.writeText(setupCode.code)}
                    aria-label="Copy setup code"
                  >
                    <Icon name="copy" size={14} />
                  </Button>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-wide text-ink-3">
                  Expires {new Date(setupCode.expiresAt).toLocaleTimeString()}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={createSetupCode}
                disabled={submitting || !label.trim()}
              >
                {submitting ? "Creating…" : "Create code"}
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => { setAddOpen(false); setError(""); setSetupCode(null) }}
              >
                Cancel
              </Button>
            </div>
          </CardBody>
        </>
      )}

      <CardDivider />

      {devices.length === 0 ? (
        <CardBody className="py-8 text-center text-[13px] text-ink-3">
          No devices assigned to this event yet.
          {canManage && " Create a setup code to provision a scanner."}
        </CardBody>
      ) : (
        <div className="divide-y divide-line">
          {devices.map((device) => (
            <CardBody key={device.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-semibold text-ink">{device.label || "Unlabelled device"}</p>
                  <Chip size="sm" variant="muted" className="capitalize">
                    {device.device_role}
                  </Chip>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  Last seen: {fmtRelative(device.last_seen_at)}
                  {device.max_scans_per_minute
                    ? ` · Rate limit: ${device.max_scans_per_minute}/min`
                    : ""}
                </p>
              </div>
              {canManage && (
                <button
                  type="button"
                  disabled={removing === device.id}
                  onClick={() => removeDevice(device.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                  aria-label="Remove device"
                >
                  <Icon name="close" size={14} />
                </button>
              )}
            </CardBody>
          ))}
        </div>
      )}
    </Card>
  )
}
