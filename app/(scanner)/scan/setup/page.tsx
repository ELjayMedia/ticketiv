"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Smartphone, QrCode, CheckCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ScannerSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [deviceName, setDeviceName] = useState("")
  const [eventId, setEventId] = useState("")

  const handleComplete = () => {
    // Save device configuration
    router.push("/scan")
  }

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Link href="/scan">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">Scanner Setup</h1>
        </div>

        <div className="p-4 space-y-6">
          {/* Progress */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    s <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                {s < 3 && <div className={`h-0.5 w-16 ${s < step ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Name Your Device</CardTitle>
                <CardDescription>Give this scanner device a recognizable name</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device-name">Device Name</Label>
                  <Input
                    id="device-name"
                    placeholder="e.g., Front Gate Scanner"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={() => setStep(2)} disabled={!deviceName}>
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Event</CardTitle>
                <CardDescription>Choose which event you'll be scanning tickets for</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event">Event</Label>
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger id="event">
                      <SelectValue placeholder="Select event..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event1">AfroFest 2025</SelectItem>
                      <SelectItem value="event2">Tech Summit</SelectItem>
                      <SelectItem value="event3">Jazz Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(3)} disabled={!eventId}>
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>All Set!</CardTitle>
                <CardDescription>Your scanner device is ready to use</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <QrCode className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{deviceName}</h3>
                  <p className="text-sm text-muted-foreground">Ready to scan tickets</p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Device ID</span>
                    <span className="font-mono">DEV-{Math.random().toString(36).substring(7).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Event</span>
                    <span className="font-medium">AfroFest 2025</span>
                  </div>
                </div>

                <Button className="w-full" onClick={handleComplete}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Start Scanning
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block min-h-screen bg-background">
        <div className="mx-auto max-w-[600px] px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Scanner Setup</h1>
            <p className="text-muted-foreground">Configure your device for ticket scanning</p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center mb-12">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                    s <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <CheckCircle className="h-5 w-5" /> : s}
                </div>
                {s < 3 && <div className={`h-0.5 w-24 ${s < step ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Name Your Device</CardTitle>
                <CardDescription>Give this scanner device a recognizable name</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device-name">Device Name</Label>
                  <Input
                    id="device-name"
                    placeholder="e.g., Front Gate Scanner"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={() => setStep(2)} disabled={!deviceName}>
                  Continue
                </Button>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Event</CardTitle>
                <CardDescription>Choose which event you'll be scanning tickets for</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event">Event</Label>
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger id="event">
                      <SelectValue placeholder="Select event..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event1">AfroFest 2025</SelectItem>
                      <SelectItem value="event2">Tech Summit</SelectItem>
                      <SelectItem value="event3">Jazz Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(3)} disabled={!eventId}>
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>All Set!</CardTitle>
                <CardDescription>Your scanner device is ready to use</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                    <QrCode className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{deviceName}</h3>
                  <p className="text-muted-foreground">Ready to scan tickets</p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Device ID</span>
                    <span className="font-mono">DEV-{Math.random().toString(36).substring(7).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Event</span>
                    <span className="font-medium">AfroFest 2025</span>
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={handleComplete}>
                  <Smartphone className="h-5 w-5 mr-2" />
                  Start Scanning
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
