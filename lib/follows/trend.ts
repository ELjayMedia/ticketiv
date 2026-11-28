export interface FollowerTrend {
  total: number
  new30d: number
  daily: Array<{ day: string; total: number }>
  publicThreshold: number
}

/** Parse fn_org_follower_trend's jsonb; anything malformed becomes null. */
export function parseFollowerTrend(raw: unknown): FollowerTrend | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (typeof r.total !== "number" || typeof r.new_30d !== "number" || !Array.isArray(r.daily)) return null
  const daily = r.daily.flatMap((d) => {
    if (!d || typeof d !== "object") return []
    const { day, total } = d as Record<string, unknown>
    return typeof day === "string" && typeof total === "number" ? [{ day, total }] : []
  })
  return {
    total: r.total,
    new30d: r.new_30d,
    daily,
    publicThreshold: typeof r.public_threshold === "number" ? r.public_threshold : 50,
  }
}

/** SVG polyline points for a sparkline of cumulative totals (0..width, 0..height, y inverted). */
export function sparklinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) return ""
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const step = values.length > 1 ? width / (values.length - 1) : 0
  return values
    .map((v, i) => {
      const x = values.length > 1 ? i * step : width / 2
      const y = max === min ? height / 2 : height - ((v - min) / span) * height
      return `${round(x)},${round(y)}`
    })
    .join(" ")
}

function round(n: number) {
  return Math.round(n * 10) / 10
}
