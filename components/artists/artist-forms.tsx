"use client"

import { useActionState } from "react"

import type { ArtistActionResult } from "@/app/manage/artists/[artistId]/actions"
import { Button } from "@/components/quiet/ui/button"
import { FormField, Textarea } from "@/components/quiet/ui/form"
import type { ManagedArtist } from "@/lib/artists/access"
import { ARTIST_LINK_KEYS, PERFORMER_TYPES } from "@/lib/artists/core"
import { cn } from "@/lib/cn"

type Action = (prev: ArtistActionResult | null, formData: FormData) => Promise<ArtistActionResult>

function Result({ state }: { state: ArtistActionResult | null }) {
  if (!state) return null
  return (
    <p role={state.ok ? "status" : "alert"} className={cn("rounded-md px-3 py-2 text-[13px]", state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
      {state.message}
    </p>
  )
}

const selectClass =
  "h-[42px] rounded-md border border-line-2 bg-surface px-3 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

export function ArtistProfileForm({ artist, action }: { artist: ManagedArtist; action: Action }) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="artistId" value={artist.id} />
      <fieldset disabled={pending} className="flex flex-col gap-4">
        <legend className="text-h3 mb-2">Public profile</legend>
        <label className="flex flex-col gap-1">
          <span className="text-label">Biography</span>
          <Textarea name="bio" defaultValue={artist.bio ?? ""} rows={5} maxLength={4000} placeholder="Who you are, your sound, highlights." />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-label">Performer type</span>
            <select name="performerType" defaultValue={artist.performerType ?? ""} className={selectClass}>
              <option value="">Not set</option>
              {PERFORMER_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <FormField label="Genres" name="genres" defaultValue={artist.genres.join(", ")} hint="Up to 8, separated by commas" />
          <FormField label="Profile photo URL" name="imageUrl" type="url" defaultValue={artist.imageUrl ?? ""} placeholder="https://" />
          <FormField label="Cover image URL" name="coverImageUrl" type="url" defaultValue={artist.coverImageUrl ?? ""} placeholder="https://" />
        </div>
      </fieldset>

      <fieldset disabled={pending} className="flex flex-col gap-4">
        <legend className="text-h3 mb-2">Music, video and social links</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {ARTIST_LINK_KEYS.map(([key, label]) => (
            <FormField key={key} label={label} name={`link_${key}`} type="url" defaultValue={artist.links[key] ?? ""} placeholder="https://" />
          ))}
        </div>
      </fieldset>

      <fieldset disabled={pending} className="flex flex-col gap-4">
        <legend className="text-h3 mb-2">Press kit and bookings</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Press kit (EPK) link" name="pressKitUrl" type="url" defaultValue={artist.pressKitUrl ?? ""} placeholder="https://" hint="PDF or web page" />
          <FormField label="Booking email" name="bookingEmail" type="email" defaultValue={artist.bookingEmail ?? ""} />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-label">Booking information</span>
          <Textarea name="bookingInfo" defaultValue={artist.bookingInfo ?? ""} rows={3} maxLength={2000} placeholder="Notice period, set lengths, technical rider, travel." />
        </label>
      </fieldset>

      <div>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
      <Result state={state} />
    </form>
  )
}

export function AddArtistManagerForm({ artistId, action }: { artistId: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="artistId" value={artistId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <FormField label="Email on their Ticketiv account" name="email" type="email" required autoComplete="off" />
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Adding…" : "Add manager"}
        </Button>
      </div>
      <Result state={state} />
    </form>
  )
}

export function RemoveArtistMemberButton({ artistId, userId, label, action }: { artistId: string; userId: string; label: string; action: Action }) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="artistId" value={artistId} />
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "…" : label}
      </Button>
      {state && !state.ok ? <span role="alert" className="text-[12px] text-danger">{state.message}</span> : null}
    </form>
  )
}
