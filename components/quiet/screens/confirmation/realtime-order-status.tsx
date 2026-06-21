"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase-client";

interface RealtimeOrderStatusProps {
  orderId: string;
  /** Only subscribe while the order is still in a pending state. */
  active: boolean;
}

/**
 * Subscribes to Supabase Realtime for a single order row.
 * When the server marks `status = 'paid'` (via the payment webhook),
 * this fires a router.refresh() so the confirmation page re-renders
 * without the buyer having to wait for a meta-refresh.
 *
 * Scoped to a single order_id so the channel does not broadcast
 * across buyers.
 */
export function RealtimeOrderStatus({ orderId, active }: RealtimeOrderStatusProps) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    const supabase = createClientSupabaseClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status;
          if (newStatus && newStatus !== "pending" && newStatus !== "awaiting_payment") {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, active, router]);

  return null;
}
