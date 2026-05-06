"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import type { Artist } from "@/lib/data/public/artists"

interface ArtistsClientProps {
  initialArtists: Artist[]
}

export default function ArtistsClient({ initialArtists }: ArtistsClientProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredArtists = searchQuery
    ? initialArtists.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : initialArtists

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <h1 className="text-4xl md:text-5xl font-bold text-balance">Artists & Speakers</h1>

      <SearchInput
        placeholder="Search artists…"
        value={searchQuery}
        onChange={setSearchQuery}
        className="max-w-md"
      />

      {filteredArtists.length > 0 ? (
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
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No artists found matching your search" : "No artists available"}
          </p>
        </div>
      )}
    </div>
  )
}
