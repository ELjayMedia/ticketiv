import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wrench, Clock, Twitter, Mail } from "lucide-react"
import Link from "next/link"

export default function MaintenancePage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 mx-auto">
            <Wrench className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">We'll Be Right Back</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">
              Ticketiv is currently undergoing scheduled maintenance to improve your experience.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Expected downtime: 2 hours</span>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h3 className="font-semibold text-sm">What's happening?</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• System upgrades and optimizations</li>
              <li>• Database maintenance</li>
              <li>• Performance improvements</li>
            </ul>
          </div>

          <div className="space-y-3 pt-2">
            <Button variant="outline" asChild className="w-full bg-transparent">
              <Link href="https://twitter.com/ticketiv" target="_blank">
                <Twitter className="h-4 w-4 mr-2" />
                Follow for Updates
              </Link>
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link href="mailto:support@ticketiv.com">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Link>
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">Thank you for your patience!</p>
        </CardContent>
      </Card>
    </div>
  )
}
