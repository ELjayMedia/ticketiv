"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Building2, ArrowRight } from "lucide-react"
import Link from "next/link"

export function NoOrgState() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-2">No Organization</h2>
        <p className="text-muted-foreground mb-6">
          You don't have access to any organizations yet. Create one or ask an admin to invite you.
        </p>

        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/orgs/new">
              <Building2 className="mr-2 h-4 w-4" />
              Create Organization
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full bg-transparent">
            <Link href="/invite">
              Invite Code
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
