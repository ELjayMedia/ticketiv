"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import { useSearchParams } from "next/navigation"
import Loading from "./loading"
import { Search } from "lucide-react"

interface OrganiserRecord {
  id: string
  name: string
  logo_url?: string
}

export default function OrganisersPage() {
  const [organisers, setOrganisers] = useState<OrganiserRecord[]>([])
  const [filteredOrganisers, setFilteredOrganisers] = useState<OrganiserRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    const fetchOrganisers = async () => {
      try {
        const response = await fetch("/api/organisers")
        if (response.ok) {
          const data = await response.json()
          setOrganisers(data)
          setFilteredOrganisers(data)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch organisers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrganisers()
  }, [])

  useEffect(() => {
    const filtered = organisers.filter((organiser) => organiser.name.toLowerCase().includes(searchQuery.toLowerCase()))
    setFilteredOrganisers(filtered)
  }, [searchQuery, organisers])

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-balance">Organisers</h1>
      </div>

      {/* Search */}
      <SearchInput
        placeholder="Search organisers…"
        value={searchQuery}
        onChange={setSearchQuery}
        className="max-w-md"
      />

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-32 bg-muted rounded-lg mb-4" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Organisers Grid */}
      {!loading && filteredOrganisers.length > 0 && (
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
      )}

      {/* Empty State */}
      {!loading && filteredOrganisers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No organisers found matching your search" : "No organisers available"}
          </p>
        </div>
      )}
    </div>
  )
}
