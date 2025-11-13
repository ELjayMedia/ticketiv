"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowRight, Music, Globe, Theater, Gamepad2, Heart, Briefcase, UtensilsCrossed } from "lucide-react"
import { MOCK_EVENTS } from "@/lib/mock-data"

const CATEGORIES = [
  {
    name: "Music",
    icon: Music,
    color: "from-purple-500 to-pink-500",
    description: "Live music performances and concerts",
    subcategories: 3,
  },
  {
    name: "Festival",
    icon: Globe,
    color: "from-blue-500 to-cyan-500",
    description: "Festivals and expos for every interest",
    subcategories: 2,
  },
  {
    name: "Workshop",
    icon: Briefcase,
    color: "from-amber-500 to-orange-500",
    description: "Educational sessions and training",
    subcategories: 3,
  },
  {
    name: "Conference",
    icon: Theater,
    color: "from-green-500 to-emerald-500",
    description: "Industry conferences and summits",
    subcategories: 2,
  },
  {
    name: "Art",
    icon: Heart,
    color: "from-rose-500 to-pink-500",
    description: "Art exhibitions and gallery openings",
    subcategories: 1,
  },
  {
    name: "Networking",
    icon: Gamepad2,
    color: "from-indigo-500 to-purple-500",
    description: "Professional networking events",
    subcategories: 2,
  },
  {
    name: "Gala",
    icon: UtensilsCrossed,
    color: "from-fuchsia-500 to-purple-500",
    description: "Premium events and galas",
    subcategories: 1,
  },
]

export default function CategoriesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const filteredCategories = useMemo(() => {
    return CATEGORIES.filter(
      (category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [searchTerm])

  const getCategoryEventCount = (categoryName: string) => {
    return MOCK_EVENTS.filter((event) => event.category === categoryName).length
  }

  const CategoryCard = ({ category }: { category: (typeof CATEGORIES)[0] }) => {
    const eventCount = getCategoryEventCount(category.name)
    const CategoryIcon = category.icon
    const categorySlug = category.name.toLowerCase().replace(/\s+/g, "-")

    return (
      <Link href={`/category/${categorySlug}`}>
        <Card className="h-full overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group">
          {/* Background with gradient */}
          <div className={`h-48 bg-gradient-to-br ${category.color} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-300" />
            <div className="absolute inset-0 flex items-center justify-center">
              <CategoryIcon className="w-16 h-16 text-white/40 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {category.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{category.description}</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{eventCount} events</span>
                <span>{category.subcategories} subcategories</span>
              </div>
              <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Card>
      </Link>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">Browse Categories</h1>
        <p className="text-lg text-muted-foreground">Explore events across all categories</p>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === "all"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Categories
        </button>
        <button
          onClick={() => setActiveTab("main")}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === "main"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Main Categories
        </button>
        <button
          onClick={() => setActiveTab("subcategories")}
          className={`pb-3 px-1 font-medium transition-colors ${
            activeTab === "subcategories"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Subcategories
        </button>
      </div>

      {/* Results info */}
      <p className="text-sm text-muted-foreground">Showing {filteredCategories.length} categories</p>

      {/* Categories Grid */}
      {filteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map((category) => (
            <CategoryCard key={category.name} category={category} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No categories found matching your search.</p>
        </div>
      )}
    </div>
  )
}
