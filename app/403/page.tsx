import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle, Home, Shield } from "lucide-react"

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <Shield className="h-8 w-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this resource.
          </p>
        </div>

        <div className="bg-muted p-4 rounded-lg flex gap-2 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-left text-muted-foreground">
            This might be due to insufficient permissions, organization membership, or the resource being unavailable.
          </p>
        </div>

        <div className="flex gap-3">
          <Button asChild className="flex-1">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 bg-transparent">
            <Link href="/profile">My Account</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
