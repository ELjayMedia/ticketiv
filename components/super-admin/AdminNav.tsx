"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Icon } from "@/components/quiet/ui/icon"
import { isActiveHref, type AdminNavGroup } from "@/components/super-admin/admin-nav"
import { cn } from "@/lib/cn"

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: Parameters<typeof Icon>[0]["name"]; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  )
}

/** Sidebar navigation. Client-side only to know the current page. */
export function AdminNav({ groups }: { groups: AdminNavGroup[] }) {
  const pathname = usePathname() ?? ""
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const anyActive = group.items.some((item) => isActiveHref(item.href, pathname))
        const links = (
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} {...item} active={isActiveHref(item.href, pathname)} />
            ))}
          </div>
        )
        if (group.collapsed) {
          return (
            <details key={group.label} open={anyActive} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3 hover:text-ink [&::-webkit-details-marker]:hidden">
                {group.label}
                <Icon name="chevD" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              {links}
            </details>
          )
        }
        return (
          <div key={group.label ?? "main"}>
            {group.label ? <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">{group.label}</p> : null}
            {links}
          </div>
        )
      })}
    </div>
  )
}
