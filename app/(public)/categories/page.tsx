import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getPublicEvents } from "@/lib/data/events"

export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const events = await getPublicEvents()
  const categories = new Map<string, number>()

  for (const event of events) {
    if (!event.category) continue
    categories.set(event.category, (categories.get(event.category) ?? 0) + 1)
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Event Categories</h1>
        <p className="text-muted-foreground">Explore curated events across popular categories.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from(categories.entries()).map(([category, count]) => {
          const slug = category.toLowerCase().replace(/\s+/g, "-")
          return (
            <Card key={category} className="border hover:border-primary transition">
              <CardHeader>
                <CardTitle>{category}</CardTitle>
                <CardDescription>
                  {count} upcoming event{count === 1 ? "" : "s"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant="secondary">{count} listed</Badge>
                <Link href={`/category/${slug}`} className="text-primary hover:underline text-sm">
                  Explore
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
