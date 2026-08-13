"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { DesktopNav } from "@/components/quiet/shell/desktop-nav";
import type { UserContext } from "@/lib/data/identity/contexts";
import { createClient } from "@/lib/supabase/client";

interface NavIdentity {
  signedIn: boolean;
  displayName?: string;
  avatarUrl?: string;
  contexts?: UserContext[];
  activeContextKey?: string | null;
}

const SIGNED_OUT: NavIdentity = { signedIn: false };

function getNavIdentity(user: User | null): NavIdentity {
  if (!user) return SIGNED_OUT;

  const metadata = user.user_metadata ?? {};
  const fullName = [
    metadata.display_name,
    metadata.full_name,
    metadata.name,
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0);
  const avatarUrl = [metadata.avatar_url, metadata.picture].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );

  return {
    signedIn: true,
    displayName: fullName?.trim().split(" ")[0] ?? user.email?.split("@")[0],
    avatarUrl,
  };
}

/** Hydrates display-only identity without making the cacheable root route dynamic. */
export function PublicSessionDesktopNav() {
  const [identity, setIdentity] = useState<NavIdentity>(SIGNED_OUT);
  const synchronizationVersion = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const synchronize = async (user: User | null) => {
      const version = ++synchronizationVersion.current;
      const nextIdentity = getNavIdentity(user);
      if (!active) return;

      setIdentity(nextIdentity);
      if (!user) return;

      try {
        const response = await fetch("/api/auth/contexts");
        if (!response.ok) return;

        const data = (await response.json()) as {
          contexts?: UserContext[];
          activeContextKey?: string | null;
        };
        if (active && synchronizationVersion.current === version) {
          setIdentity({
            ...nextIdentity,
            contexts: data.contexts ?? [],
            activeContextKey: data.activeContextKey ?? null,
          });
        }
      } catch {
        // Identity remains usable when the optional context menu cannot load.
      }
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      void synchronize(session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void synchronize(session?.user ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return <DesktopNav {...identity} />;
}
