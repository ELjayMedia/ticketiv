"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, AlertCircle, ArrowLeft, Check } from "lucide-react"
import { formatCurrency } from "@/lib/pricing"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Channel = "web" | "mobile" | "affiliate" | "pos" | "resale"

interface ChannelConfig {
  id: string
  channel: Channel
  quota: number
  per_order_limit: number | ""
}

interface CreateTicketTypeFormProps {
  event: any
}

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile App" },
  { value: "affiliate", label: "Affiliate" },
  { value: "pos", label: "Point of Sale" },
  { value: "resale", label: "Resale" },
]

export function CreateTicketTypeForm({ event }: CreateTicketTypeFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [priceCents, setPriceCents] = useState(0)
  const [currency, setCurrency] = useState("USD")
  const [quota, setQuota] = useState(100)
  const [perUserLimit, setPerUserLimit] = useState<number | "">("")
  const [saleStartAt, setSaleStartAt] = useState("")
  const [saleEndAt, setSaleEndAt] = useState("")
  const [isReservedSeating, setIsReservedSeating] = useState(false)

  // Channel state
  const [channels, setChannels] = useState<ChannelConfig[]>([
    { id: crypto.randomUUID(), channel: "web", quota: 100, per_order_limit: "" },
  ])

  const totalChannelQuota = channels.reduce((sum, c) => sum + c.quota, 0)
  const hasQuotaWarning = totalChannelQuota > quota

  const addChannel = () => {
    setChannels([...channels, { id: crypto.randomUUID(), channel: "mobile", quota: 0, per_order_limit: "" }])
  }

  const removeChannel = (id: string) => {
    if (channels.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one channel is required",
        variant: "destructive",
      })
      return
    }
    setChannels(channels.filter((c) => c.id !== id))
  }

  const updateChannel = (id: string, field: keyof ChannelConfig, value: any) => {
    setChannels(channels.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  const handleSubmit = async (saveAndAddAnother = false) => {
    // Validation
    if (!name.trim()) {
      toast({
        title: "Validation error",
        description: "Ticket name is required",
        variant: "destructive",
      })
      return
    }

    if (priceCents < 0) {
      toast({
        title: "Validation error",
        description: "Price must be 0 or greater",
        variant: "destructive",
      })
      return
    }

    if (quota <= 0) {
      toast({
        title: "Validation error",
        description: "Quota must be greater than 0",
        variant: "destructive",
      })
      return
    }

    if (hasQuotaWarning) {
      toast({
        title: "Validation error",
        description: "Sum of channel quotas cannot exceed total quota",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/ticket-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          name,
          description,
          price_cents: priceCents,
          currency,
          quota,
          per_user_limit: perUserLimit,
          sale_start_at: saleStartAt || null,
          sale_end_at: saleEndAt || null,
          is_reserved_seating: isReservedSeating,
          channels: channels.map((c) => ({
            channel: c.channel,
            quota: c.quota,
            per_order_limit: c.per_order_limit,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create ticket type")
      }

      toast({
        title: "Success",
        description: "Ticket type created successfully",
      })

      if (saveAndAddAnother) {
        // Reset form
        setName("")
        setDescription("")
        setPriceCents(0)
        setQuota(100)
        setPerUserLimit("")
        setSaleStartAt("")
        setSaleEndAt("")
        setIsReservedSeating(false)
        setChannels([{ id: crypto.randomUUID(), channel: "web", quota: 100, per_order_limit: "" }])
      } else {
        router.push(`/events/${event.id}?tab=tickets`)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/events/${event.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Create Ticket Type</h1>
            <p className="text-sm text-muted-foreground">{event.title}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ticket Basics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name*</Label>
              <Input
                id="name"
                placeholder="e.g. General Admission"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what's included..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price*</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={(priceCents / 100).toFixed(2)}
                  onChange={(e) => setPriceCents(Math.round(Number.parseFloat(e.target.value) * 100))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quota">Total Quota*</Label>
                <Input
                  id="quota"
                  type="number"
                  min="1"
                  value={quota}
                  onChange={(e) => setQuota(Number.parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perUserLimit">Per User Limit (Optional)</Label>
                <Input
                  id="perUserLimit"
                  type="number"
                  min="1"
                  value={perUserLimit}
                  placeholder="No limit"
                  onChange={(e) => setPerUserLimit(e.target.value === "" ? "" : Number.parseInt(e.target.value, 10))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="saleStart">Sale Start (Optional)</Label>
              <Input
                id="saleStart"
                type="datetime-local"
                value={saleStartAt}
                onChange={(e) => setSaleStartAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="saleEnd">Sale End (Optional)</Label>
              <Input
                id="saleEnd"
                type="datetime-local"
                value={saleEndAt}
                onChange={(e) => setSaleEndAt(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Reserved Seating</Label>
                <p className="text-xs text-muted-foreground">Enable seat selection</p>
              </div>
              <Switch checked={isReservedSeating} onCheckedChange={setIsReservedSeating} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Sales Channels</CardTitle>
            <Button size="sm" variant="outline" onClick={addChannel}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {hasQuotaWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Channel quotas ({totalChannelQuota}) exceed total quota ({quota})
                </AlertDescription>
              </Alert>
            )}

            {channels.map((channel) => (
              <Card key={channel.id} className="p-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Select
                      value={channel.channel}
                      onValueChange={(value) => updateChannel(channel.id, "channel", value as Channel)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNELS.map((ch) => (
                          <SelectItem key={ch.value} value={ch.value}>
                            {ch.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {channels.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removeChannel(channel.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Quota</Label>
                      <Input
                        type="number"
                        min="0"
                        value={channel.quota}
                        onChange={(e) => updateChannel(channel.id, "quota", Number.parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Per Order Limit (Optional)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={channel.per_order_limit}
                        placeholder="No limit"
                        onChange={(e) => updateChannel(channel.id, "per_order_limit", e.target.value === "" ? "" : Number.parseInt(e.target.value, 10))}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <div className="pt-2 text-xs text-muted-foreground">
              Total channel allocation: {totalChannelQuota} / {quota}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{name || "Ticket Name"}</p>
                  <p className="text-sm text-muted-foreground">{description || "Description will appear here"}</p>
                </div>
                <Badge>{quota} left</Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{formatCurrency(priceCents)}</span>
                <span className="text-sm text-muted-foreground">per ticket</span>
              </div>
              {perUserLimit && <p className="text-xs text-muted-foreground">Max {perUserLimit} per person</p>}
            </div>
          </CardContent>
        </Card>

        <div className="sticky bottom-0 bg-background border-t p-4 space-y-2">
          <Button className="w-full" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Ticket Type"}
          </Button>
          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
          >
            Save & Add Another
          </Button>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block mx-auto max-w-[1200px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" asChild className="mb-2">
              <Link href={`/events/${event.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Event
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Create Ticket Type</h1>
            <p className="text-muted-foreground mt-1">{event.title}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Basics</CardTitle>
                <CardDescription>Configure the core details for this ticket type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name-desktop">Name*</Label>
                  <Input
                    id="name-desktop"
                    placeholder="e.g. General Admission, VIP Pass, Early Bird"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description-desktop">Description</Label>
                  <Textarea
                    id="description-desktop"
                    placeholder="Describe what's included with this ticket..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="price-desktop">Price*</Label>
                    <Input
                      id="price-desktop"
                      type="number"
                      step="0.01"
                      min="0"
                      value={(priceCents / 100).toFixed(2)}
                      onChange={(e) => setPriceCents(Math.round(Number.parseFloat(e.target.value || "0") * 100))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency-desktop">Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency-desktop">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="ZAR">ZAR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quota-desktop">Total Quota*</Label>
                    <Input
                      id="quota-desktop"
                      type="number"
                      min="1"
                      value={quota}
                      onChange={(e) => setQuota(Number.parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">Total tickets available</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="perUserLimit-desktop">Per User Limit (Optional)</Label>
                    <Input
                      id="perUserLimit-desktop"
                      type="number"
                      min="1"
                      value={perUserLimit}
                      placeholder="No limit"
                      onChange={(e) => setPerUserLimit(e.target.value === "" ? "" : Number.parseInt(e.target.value, 10))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="saleStart-desktop">Sale Start (Optional)</Label>
                    <Input
                      id="saleStart-desktop"
                      type="datetime-local"
                      value={saleStartAt}
                      onChange={(e) => setSaleStartAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saleEnd-desktop">Sale End (Optional)</Label>
                    <Input
                      id="saleEnd-desktop"
                      type="datetime-local"
                      value={saleEndAt}
                      onChange={(e) => setSaleEndAt(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label>Reserved Seating</Label>
                    <p className="text-sm text-muted-foreground">Enable seat selection for this ticket type</p>
                  </div>
                  <Switch checked={isReservedSeating} onCheckedChange={setIsReservedSeating} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Sales Channels</CardTitle>
                  <CardDescription>Configure quota and limits per sales channel</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={addChannel}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Channel
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasQuotaWarning && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Total channel quotas ({totalChannelQuota}) cannot exceed ticket quota ({quota}). Adjust channel
                      allocations.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  {channels.map((channel, index) => (
                    <div key={channel.id} className="flex items-end gap-3 rounded-lg border p-4">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Channel</Label>
                          <Select
                            value={channel.channel}
                            onValueChange={(value) => updateChannel(channel.id, "channel", value as Channel)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHANNELS.map((ch) => (
                                <SelectItem key={ch.value} value={ch.value}>
                                  {ch.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Quota</Label>
                          <Input
                            type="number"
                            min="0"
                            value={channel.quota}
                            onChange={(e) => updateChannel(channel.id, "quota", Number.parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Per Order Limit (Optional)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={channel.per_order_limit}
                            placeholder="No limit"
                            onChange={(e) => updateChannel(channel.id, "per_order_limit", e.target.value === "" ? "" : Number.parseInt(e.target.value, 10))}
                          />
                        </div>
                      </div>
                      {channels.length > 1 && (
                        <Button size="icon" variant="ghost" onClick={() => removeChannel(channel.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 text-sm">
                  <span className="text-muted-foreground">Total channel allocation:</span>
                  <span className={hasQuotaWarning ? "text-destructive font-medium" : "font-medium"}>
                    {totalChannelQuota} / {quota}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Preview */}
          <div className="space-y-6">
            <div className="sticky top-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Attendee Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border-2 border-dashed p-6 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{name || "Ticket Name"}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {description || "Ticket description will appear here"}
                        </p>
                      </div>
                      <Badge variant="secondary">{quota} left</Badge>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{formatCurrency(priceCents, currency)}</span>
                        <span className="text-sm text-muted-foreground">per ticket</span>
                      </div>
                    </div>

                    {perUserLimit && (
                      <div className="text-xs text-muted-foreground">
                        Maximum {perUserLimit} {perUserLimit === 1 ? "ticket" : "tickets"} per person
                      </div>
                    )}

                    {(saleStartAt || saleEndAt) && (
                      <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
                        {saleStartAt && (
                          <p>
                            Sales start: {new Date(saleStartAt).toLocaleDateString()} at{" "}
                            {new Date(saleStartAt).toLocaleTimeString()}
                          </p>
                        )}
                        {saleEndAt && (
                          <p>
                            Sales end: {new Date(saleEndAt).toLocaleDateString()} at{" "}
                            {new Date(saleEndAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    )}

                    {isReservedSeating && (
                      <Badge variant="outline" className="w-full justify-center">
                        <Check className="mr-1 h-3 w-3" />
                        Reserved Seating
                      </Badge>
                    )}

                    <Button className="w-full" disabled>
                      Select Tickets
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2 pt-4">
                <Button className="w-full" size="lg" onClick={() => handleSubmit(false)} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Ticket Type"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  size="lg"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                >
                  Save & Add Another
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
