import "server-only"

// Server-only — never import from client components.
// All functions require VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID.

const BASE = "https://api.vercel.com"

function headers() {
  const token = process.env.VERCEL_TOKEN
  if (!token) throw new Error("VERCEL_TOKEN is not configured")
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }
}

function projectUrl(path: string) {
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID
  if (!projectId) throw new Error("VERCEL_PROJECT_ID is not configured")
  const base = `${BASE}/v9/projects/${projectId}/env${path}`
  return teamId ? `${base}${path.includes("?") ? "&" : "?"}teamId=${teamId}` : base
}

export type EnvTarget = "production" | "preview" | "development"
export type EnvType = "plain" | "secret" | "encrypted" | "system"

export interface VercelEnvVar {
  id: string
  key: string
  value: string | null // null = secret, never sent to client
  type: EnvType
  target: EnvTarget[]
  createdAt: number
  updatedAt: number
  gitBranch?: string
}

export interface CreateEnvVar {
  key: string
  value: string
  type: "plain" | "encrypted"
  target: EnvTarget[]
  gitBranch?: string
}

export async function listEnvVars(): Promise<VercelEnvVar[]> {
  const res = await fetch(projectUrl(""), {
    headers: headers(),
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Vercel list env vars failed: ${res.status} — ${body}`)
  }
  const data = await res.json()
  // Vercel returns { envs: [...] }
  return (data.envs ?? []) as VercelEnvVar[]
}

export async function createEnvVar(input: CreateEnvVar): Promise<VercelEnvVar> {
  const res = await fetch(projectUrl(""), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Vercel create env var failed: ${res.status} — ${body}`)
  }
  return res.json() as Promise<VercelEnvVar>
}

export async function updateEnvVar(
  id: string,
  input: Partial<Pick<CreateEnvVar, "value" | "target" | "gitBranch">>,
): Promise<VercelEnvVar> {
  const res = await fetch(projectUrl(`/${id}`), {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Vercel update env var failed: ${res.status} — ${body}`)
  }
  return res.json() as Promise<VercelEnvVar>
}

export async function deleteEnvVar(id: string): Promise<void> {
  const res = await fetch(projectUrl(`/${id}`), {
    method: "DELETE",
    headers: headers(),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Vercel delete env var failed: ${res.status} — ${body}`)
  }
}
