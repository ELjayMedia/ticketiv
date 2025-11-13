export type WorkspaceType = "public" | "app" | "organizer" | "scanner"

export interface NavItem {
  href: string
  label: string
  description?: string
}

interface WorkspaceNavigationConfig {
  label: string
  home: string
  items: NavItem[]
}

const WORKSPACE_NAVIGATION: Record<WorkspaceType, WorkspaceNavigationConfig> = {
  public: {
    label: "Discover",
    home: "/browse",
    items: [
      { href: "/browse", label: "Browse" },
      { href: "/categories", label: "Categories" },
      { href: "/artists", label: "Artists" },
      { href: "/dashboard", label: "Attendee App" },
      { href: "/events", label: "Organizer Workspace" },
      { href: "/scan", label: "Scanner" },
    ],
  },
  app: {
    label: "Attendee",
    home: "/dashboard",
    items: [
      { href: "/browse", label: "Browse" },
      { href: "/dashboard", label: "My Tickets" },
      { href: "/checkout/1", label: "Checkout" },
      { href: "/events", label: "Organizer" },
      { href: "/scan", label: "Scanner" },
    ],
  },
  organizer: {
    label: "Organizer",
    home: "/events",
    items: [
      { href: "/events", label: "Events" },
      { href: "/payouts", label: "Payouts" },
      { href: "/dashboard", label: "Attendee" },
      { href: "/scan", label: "Scanner" },
    ],
  },
  scanner: {
    label: "Scanner",
    home: "/scan",
    items: [
      { href: "/scan", label: "Scan Tickets" },
      { href: "/dashboard", label: "Attendee" },
      { href: "/events", label: "Organizer" },
      { href: "/browse", label: "Browse" },
    ],
  },
}

export function getWorkspaceNavigation(workspace: WorkspaceType): NavItem[] {
  return WORKSPACE_NAVIGATION[workspace].items
}

export function getWorkspaceHome(workspace: WorkspaceType): string {
  return WORKSPACE_NAVIGATION[workspace].home
}

export function getWorkspaceLabel(workspace: WorkspaceType): string {
  return WORKSPACE_NAVIGATION[workspace].label
}
