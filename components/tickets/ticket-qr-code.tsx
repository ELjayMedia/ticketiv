"use client"

import QRCode from "react-qr-code"

import { cn } from "@/lib/utils"

type TicketQrCodeProps = {
  value: string
  label?: string
  size?: number
  className?: string
}

export function TicketQrCode({ value, label = "Ticket QR code", size = 224, className }: TicketQrCodeProps) {
  return (
    <div className={cn("rounded bg-white p-2", className)} aria-label={label} role="img">
      <QRCode value={value} size={size} level="M" bgColor="#ffffff" fgColor="#000000" />
    </div>
  )
}
