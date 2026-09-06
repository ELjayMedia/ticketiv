import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const migrationsDir = join(process.cwd(), "supabase/migrations")

/**
 * Read the canonical migration chain in execution order.
 *
 * Ticketiv compacted its historical migrations into a production baseline on
 * 5 September 2026. Contract tests must assert the schema/behavior that the
 * current chain produces rather than depend on migration filenames that no
 * longer exist.
 */
export function readMigrationChain(): string {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
    .join("\n\n")
}

/**
 * Return a bounded section of the canonical chain around a semantic marker.
 * Use this for negative assertions so unrelated SQL elsewhere in the large
 * production baseline cannot create a false failure.
 */
export function migrationContractAround(
  marker: string,
  before = 1_000,
  after = 12_000,
): string {
  const sql = readMigrationChain()
  const haystack = sql.toLowerCase()
  const needle = marker.toLowerCase()
  const index = haystack.indexOf(needle)

  if (index < 0) {
    throw new Error(`Migration contract marker not found: ${marker}`)
  }

  return sql.slice(Math.max(0, index - before), Math.min(sql.length, index + after))
}
