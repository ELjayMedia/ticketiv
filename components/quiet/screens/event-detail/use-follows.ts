"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { getFollowStateAction, setFollowAction, type FollowKind } from "@/app/(consumer)/follows/actions";

/**
 * Real follows for the event page: loads the viewer's state after the cached
 * page renders, toggles optimistically, and sends signed-out visitors to log
 * in and come back. Following an organiser or artist means an in-app alert
 * (and push, if allowed) when they announce their next event.
 */
export function useFollows({
  orgId,
  artistIds,
  returnTo,
}: {
  orgId: string | null;
  artistIds: ReadonlyArray<string>;
  returnTo: string;
}) {
  const router = useRouter();
  const [organizer, setOrganizer] = React.useState(false);
  const [artists, setArtists] = React.useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = React.useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = React.useState<string | null>(null);
  const artistKey = artistIds.join(",");

  React.useEffect(() => {
    let cancelled = false;
    getFollowStateAction(orgId, artistKey ? artistKey.split(",") : [])
      .then((state) => {
        if (cancelled) return;
        setOrganizer(state.organizer);
        setArtists(new Set(state.artistIds));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [orgId, artistKey]);

  const toggle = React.useCallback(
    async (kind: FollowKind, id: string | null, name: string) => {
      if (!id) return;
      const key = `${kind}:${id}`;
      if (pending.has(key)) return;
      const was = kind === "organizer" ? organizer : artists.has(id);
      const apply = (on: boolean) => {
        if (kind === "organizer") setOrganizer(on);
        else
          setArtists((prev) => {
            const next = new Set(prev);
            if (on) next.add(id);
            else next.delete(id);
            return next;
          });
      };
      apply(!was);
      setPending((prev) => new Set(prev).add(key));
      setNotice(null);
      try {
        const result = await setFollowAction(kind, id, !was);
        if (!result.ok) {
          apply(was);
          if (result.reason === "sign_in") {
            router.push(`/login?next=${encodeURIComponent(returnTo)}`);
            return;
          }
          setNotice(result.message);
          return;
        }
        setNotice(result.following ? `Following ${name}. We'll tell you when they announce something new.` : `You've unfollowed ${name}.`);
      } catch {
        apply(was);
        setNotice("Couldn't update that right now. Try again.");
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [artists, organizer, pending, returnTo, router],
  );

  return {
    organizerFollowed: organizer,
    isArtistFollowed: (id: string | null | undefined) => Boolean(id && artists.has(id)),
    isPending: (kind: FollowKind, id: string | null | undefined) => Boolean(id && pending.has(`${kind}:${id}`)),
    toggle,
    notice,
  };
}
