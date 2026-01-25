"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import { getPublicArtists } from "@/lib/data/public"
import type { Artist } from "@/lib/data/public/artists"

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [filteredArtists, setFilteredArtists] = useState<Artist[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const data = await getPublicArtists({ limit: 50 })
        setArtists(data)
        setFilteredArtists(data)
      } catch (error) {
        console.error("[v0] Failed to fetch artists:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchArtists()
  }, [])

  useEffect(() => {
    const filtered = artists.filter((artist) => artist.name.toLowerCase().includes(searchQuery.toLowerCase()))
    setFilteredArtists(filtered)
  }, [searchQuery, artists])

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-balance">Artists & Speakers</h1>
      </div>

      {/* Search */}
      <SearchInput
        placeholder="Search artists…"
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

      {/* Artists Grid */}
      {!loading && filteredArtists.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArtists.map((artist) => (
            <Link key={artist.id} href={`/artists/${artist.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300 cursor-pointer overflow-hidden">
                <div className="aspect-square bg-muted overflow-hidden relative group">
                  <img
                    src={artist.avatar_url || "/placeholder.svg"}
                    alt={artist.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="pt-4 space-y-2">
                  <h3 className="font-semibold line-clamp-2">{artist.name}</h3>
                  {artist.role && <Badge className="w-fit text-xs">{artist.role}</Badge>}
                  {artist.bio && <p className="text-sm text-muted-foreground line-clamp-2">{artist.bio}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredArtists.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No artists found matching your search" : "No artists available"}
          </p>
        </div>
      )}
    </div>
  )
}
