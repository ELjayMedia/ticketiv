"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react"

export type CheckoutStep = "select" | "promo" | "preview" | "payment" | "success"

export interface CheckoutFlowProps {
  eventTitle: string
  eventId: string
  onComplete?: (orderId: string) => void
  onCancel?: () => void
}

export interface CartItem {
  ticketTypeId: string
  ticketTypeName: string
  quantity: number
  unitPrice: number
}

export function CheckoutFlow({
  eventTitle,
  eventId,
  onComplete,
  onCancel,
}: CheckoutFlowProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("select")
  const [cart, setCart] = useState<CartItem[]>([])
  const [promoCode, setPromoCode] = useState("")
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const total = Math.max(0, subtotal - discount)
  const steps: Array<{ id: CheckoutStep; label: string }> = [
    { id: "select", label: "Select Tickets" },
    { id: "promo", label: "Apply Promo" },
    { id: "preview", label: "Review Order" },
    { id: "payment", label: "Payment" },
    { id: "success", label: "Success" },
  ]

  const handleAddItem = (ticketTypeId: string, ticketTypeName: string, price: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.ticketTypeId === ticketTypeId)
      if (existing) {
        return prev.map((item) =>
          item.ticketTypeId === ticketTypeId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { ticketTypeId, ticketTypeName, quantity: 1, unitPrice: price }]
    })
  }

  const handleApplyPromo = async () => {
    setLoading(true)
    try {
      // Call API to validate promo code
      // This would typically call an RPC or API route
      setDiscount(1000) // Example: $10 discount
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    setLoading(true)
    try {
      // Call API to process payment
      // This would call your checkout/orders API
      setCurrentStep("success")
      onComplete?.("order-123")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => {
            const isActive = currentStep === step.id
            const isCompleted = steps.findIndex((s) => s.id === currentStep) > idx

            return (
              <div key={step.id} className="flex-1 flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    idx + 1
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-colors ${
                      isCompleted ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          {steps.map((step) => (
            <span key={step.id}>{step.label}</span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === "select" && "Select Tickets"}
            {currentStep === "promo" && "Apply Promo Code"}
            {currentStep === "preview" && "Review Your Order"}
            {currentStep === "payment" && "Payment Method"}
            {currentStep === "success" && "Order Complete!"}
          </CardTitle>
          <CardDescription>{eventTitle}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* SELECT STEP */}
          {currentStep === "select" && (
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <p>Ticket options would be rendered here</p>
                <Button
                  onClick={() => setCurrentStep("promo")}
                  className="w-full"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* PROMO STEP */}
          {currentStep === "promo" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={handleApplyPromo}
                  disabled={loading || !promoCode}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Apply"
                  )}
                </Button>
              </div>
              {discount > 0 && (
                <Badge variant="secondary">
                  Discount Applied: ${(discount / 100).toFixed(2)}
                </Badge>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("select")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep("preview")}
                  className="flex-1"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* PREVIEW STEP */}
          {currentStep === "preview" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.ticketTypeId} className="flex justify-between text-sm">
                    <span>
                      {item.ticketTypeName} × {item.quantity}
                    </span>
                    <span>${(item.unitPrice * item.quantity / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${(subtotal / 100).toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${(discount / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>${(total / 100).toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("promo")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep("payment")}
                  className="flex-1"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* PAYMENT STEP */}
          {currentStep === "payment" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Payment processing would occur here
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep("preview")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Pay ${(total / 100).toFixed(2)}
                </Button>
              </div>
            </div>
          )}

          {/* SUCCESS STEP */}
          {currentStep === "success" && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Order Confirmed!</h3>
                <p className="text-sm text-muted-foreground">
                  Your tickets have been minted and are ready to use.
                </p>
              </div>
              <Button onClick={onCancel} className="w-full">
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
