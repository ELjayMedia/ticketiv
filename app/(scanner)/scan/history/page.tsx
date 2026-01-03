"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Calendar } from "lucide-react"
import Link from "next/link"

const mockScans = [
  {
    id: "1",
    ticket_code: "TKT-ABC123",
    outcome: "valid",
    scanned_at: "2025-01-28T14:32:00Z",
    holder_name: "John Doe",
  },
  { id: "2", ticket_code: "TKT-DEF456", outcome: "already_used", scanned_at: "2025-01-28T14:31:00Z" },
  {
    id: "3",
    ticket_code: "TKT-GHI789",
    outcome: "valid",
    scanned_at: "2025-01-28T14:30:00Z",
    holder_name: "Jane Smith",
  },
  { id: "4", ticket_code: "TKT-JKL012", outcome: "invalid", scanned_at: "2025-01-28T14:29:00Z" },
  {
    id: "5",
    ticket_code: "TKT-MNO345",
    outcome: "valid",
    scanned_at: "2025-01-28T14:28:00Z",
    holder_name: "Mike Johnson",
  },
]

export default function ScanHistoryPage() {
  const validScans = mockScans.filter((s) => s.outcome === "valid").length
  const totalScans = mockScans.length

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
          <h1 className="font-semibold">Scan History</h1>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-primary">{validScans}</p>
                <p className="text-sm text-muted-foreground mt-1">Valid Scans</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{totalScans}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Scans</p>
              </CardContent>
            </Card>
          </div>

          {/* Today's Scans */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Today's Activity</span>
            </div>
            {mockScans.map((scan) => (
              <Card key={scan.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-medium truncate">{scan.ticket_code}</p>
                      {scan.holder_name && <p className="text-sm text-muted-foreground">{scan.holder_name}</p>}
                    </div>
                    <Badge variant={scan.outcome === "valid" ? "default" : "destructive"} className="shrink-0">
                      {scan.outcome === "valid" ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : scan.outcome === "already_used" ? (
                        <AlertCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {scan.outcome === "valid" ? "Valid" : scan.outcome === "already_used" ? "Used" : "Invalid"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(scan.scanned_at).toLocaleTimeString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block min-h-screen bg-background">
        <div className="mx-auto max-w-[900px] px-4 py-8">
          <div className="mb-8">
            <Link href="/scan">
              <Button variant="ghost" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Scanner
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Scan History</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold text-primary">{validScans}</p>
                <p className="text-sm text-muted-foreground mt-2">Valid Scans</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold">{totalScans}</p>
                <p className="text-sm text-muted-foreground mt-2">Total Scans</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-4xl font-bold">{totalScans - validScans}</p>
                <p className="text-sm text-muted-foreground mt-2">Rejected</p>
              </CardContent>
            </Card>
          </div>

          {/* History */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Activity
              </h2>
              <div className="space-y-3">
                {mockScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-mono font-medium">{scan.ticket_code}</p>
                        <Badge variant={scan.outcome === "valid" ? "default" : "destructive"}>
                          {scan.outcome === "valid" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : scan.outcome === "already_used" ? (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {scan.outcome === "valid"
                            ? "Valid"
                            : scan.outcome === "already_used"
                              ? "Already Used"
                              : "Invalid"}
                        </Badge>
                      </div>
                      {scan.holder_name && <p className="text-sm text-muted-foreground">{scan.holder_name}</p>}
                    </div>
                    <p className="text-sm text-muted-foreground">{new Date(scan.scanned_at).toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
