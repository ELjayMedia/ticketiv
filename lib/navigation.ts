/**
 * Workspaces that use the shared WorkspaceShell. Organizers have their own
 * /orgs/[orgId] workspace (components/quiet/shell/org-nav), and the public
 * site uses the mobile shell / desktop nav.
 */
export type WorkspaceType = "public" | "app" | "scanner"
