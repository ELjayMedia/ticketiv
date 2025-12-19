"use client"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { LucideIcon } from "lucide-react"

export type CategoryItem = {
  id: string
  label: string
  icon: LucideIcon
  isNew?: boolean
}

interface CategoryRailProps {
  items: CategoryItem[]
  value?: string
  onChange?: (id: string) => void
  className?: string
}

export function CategoryRail({ items, value, onChange, className }: CategoryRailProps) {
  return (
    <section className={cn("w-full", className)}>
      <div
        className={cn(
          "flex gap-6 overflow-x-auto pb-2",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {items.map((item) => {
          const active = value === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange?.(item.id)}
              className="flex min-w-[92px] flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
              aria-pressed={active}
              aria-label={`${item.label} category${item.isNew ? " (new)" : ""}`}
            >
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-20 w-20 rounded-full border-2 bg-background p-0",
                    "transition-all duration-200 hover:shadow-md hover:scale-105",
                    active && "border-primary ring-2 ring-primary/20 shadow-sm",
                  )}
                  asChild
                >
                  <div>
                    <Icon
                      className={cn("transition-colors h-28 w-28", active ? "text-primary" : "text-muted-foreground")}
                    />
                  </div>
                </Button>

                {item.isNew && (
                  <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">
                    New
                  </Badge>
                )}
              </div>

              <span
                className={cn(
                  "text-xs font-medium text-center line-clamp-2 max-w-[92px]",
                  active ? "text-primary" : "text-foreground",
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
