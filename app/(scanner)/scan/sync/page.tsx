"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, WifiOff, RefreshCcw, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function SyncQueuePage() {
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)

  const pendingScans = 3
  const lastSync = "2 minutes ago"

  const handleSync = async () => {
    setSyncing(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setSyncing(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
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
          <h1 className="font-semibold">Offline Sync</h1>
        </div>

        <div className="p-4 space-y-4">
          {/* Status Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="font-medium">Offline Mode</span>
                </div>
                <Badge variant="outline">
                  <WifiOff className="h-3 w-3 mr-1" />
                  No Connection
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending Scans</span>
                  <span className="font-semibold">{pendingScans}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span className="font-medium">{lastSync}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sync Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sync Queue</CardTitle>
              <CardDescription>Scans waiting to be uploaded</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {syncing ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Syncing...</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              ) : (
                <>
                  <div className="bg-muted/50 p-4 rounded-lg flex gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium mb-1">Offline scanning is active</p>
                      <p>Your scans are stored locally and will sync when you're back online.</p>
                    </div>
                  </div>

                  <Button className="w-full" onClick={handleSync} disabled={pendingScans === 0}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Sync Now
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pending Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-mono text-sm font-medium">TKT-{String(i).padStart(6, "0")}</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block min-h-screen bg-background">
        <div className="mx-auto max-w-[800px] px-4 py-8">
          <div className="mb-8">
            <Link href="/scan">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Scanner
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Offline Sync</h1>
          </div>

          <div className="grid gap-6">
            {/* Status Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-lg font-medium">Offline Mode Active</span>
                  </div>
                  <Badge variant="outline" className="text-base">
                    <WifiOff className="h-4 w-4 mr-2" />
                    No Connection
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pending Scans</p>
                    <p className="text-3xl font-bold">{pendingScans}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Last Sync</p>
                    <p className="text-xl font-semibold">{lastSync}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sync Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Queue</CardTitle>
                <CardDescription>Scans waiting to be uploaded to the server</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {syncing ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Syncing scans...</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                ) : (
                  <>
                    <div className="bg-muted/50 p-4 rounded-lg flex gap-4">
                      <AlertCircle className="h-6 w-6 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-1">Offline scanning is active</p>
                        <p>
                          Your scans are stored locally on this device and will automatically sync when you're back
                          online. You can also manually sync anytime.
                        </p>
                      </div>
                    </div>

                    <Button size="lg" className="w-full" onClick={handleSync} disabled={pendingScans === 0}>
                      <RefreshCcw className="h-5 w-5 mr-2" />
                      Sync Now
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Pending Items */}
            <Card>
              <CardHeader>
                <CardTitle>Pending Items ({pendingScans})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-mono font-medium">TKT-{String(i).padStart(6, "0")}</p>
                        <p className="text-sm text-muted-foreground">Valid scan • 2 minutes ago</p>
                      </div>
                    </div>
                    <Badge variant="outline">Pending Upload</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
