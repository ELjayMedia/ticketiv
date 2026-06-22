"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function requestTransferByEmail(
  orderItemId: string,
  recipientEmail: string,
): Promise<{ ok: boolean; transferId?: string; error?: string }> {
  if (!orderItemId || !recipientEmail.trim()) {
    return { ok: false, error: "Order item and recipient email are required" }
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not authenticated" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const { data, error } = await (supabase.rpc as any)("fn_request_transfer_by_email", {
    p_order_item_id: orderItemId,
    p_recipient_email: recipientEmail.trim().toLowerCase(),
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath("/tickets")
  return { ok: true, transferId: (data as any)?.transfer_id }
}
