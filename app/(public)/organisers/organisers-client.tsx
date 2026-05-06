"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import type { OrganiserSummary } from "@/lib/data/public"

interface OrganisersClientProps {
  initialOrganisers: OrganiserSummary[]
}

export default function OrganisersClient({ initialOrganisers }: OrganisersClientProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredOrganisers = searchQuery
    ? initialOrganisers.filter((o) => o.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : initialOrganisers

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <h1 className="text-4xl md:text-5xl font-bold text-balance">Organisers</h1>

      <SearchInput
        placeholder="Search organisers…"
        value={searchQuery}
        onChange={setSearchQuery}
        className="max-w-md"
      />

      {filteredOrganisers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrganisers.map((organiser) => (
            <Link key={organiser.id} href={`/organisers/${organiser.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300 cursor-pointer overflow-hidden">
                <div className="aspect-square bg-muted overflow-hidden relative group">
                  <img
                    src={organiser.logo_url || "/placeholder.svg"}
                    alt={organiser.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="pt-4 space-y-2">
                  <h3 className="font-semibold line-clamp-2">{organiser.name}</h3>
                  <Badge className="w-fit text-xs">Organiser</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No organisers found matching your search" : "No organisers available"}
          </p>
        </div>
      )}
    </div>
  )
}
