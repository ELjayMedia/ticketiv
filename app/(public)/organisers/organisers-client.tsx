"use client"

import { useState } from "react"
import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
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
    <main className="mx-auto flex w-full max-w-[980px] flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-h1 sm:text-[32px]">Organisers</h1>

      <label className="flex w-full max-w-md items-stretch overflow-hidden rounded-md border border-line-2 bg-surface focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft">
        <span className="flex items-center px-3 text-ink-3">
          <Icon name="search" size={16} />
        </span>
        <input
          type="search"
          placeholder="Search organisers…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent py-2.5 pr-3 text-[14px] font-medium text-ink placeholder:text-ink-4 focus:outline-none"
        />
      </label>

      {filteredOrganisers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrganisers.map((organiser) => (
            <Link key={organiser.id} href={`/organisers/${organiser.id}`} className="block">
              <Card className="h-full overflow-hidden transition-colors hover:border-line-2">
                <div className="aspect-square overflow-hidden bg-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={organiser.logo_url || "/placeholder.svg"}
                    alt={organiser.name}
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
                <CardBody className="flex flex-col gap-2 px-4 py-3">
                  <h3 className="line-clamp-2 text-[14px] font-semibold text-ink">{organiser.name}</h3>
                  <Chip size="sm" variant="default" className="w-fit">Organiser</Chip>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card flat className="border-dashed">
          <CardBody className="px-6 py-12 text-center">
            <p className="text-[13px] text-ink-3">
              {searchQuery ? "No organisers found matching your search." : "No organisers available."}
            </p>
          </CardBody>
        </Card>
      )}
    </main>
  )
}
