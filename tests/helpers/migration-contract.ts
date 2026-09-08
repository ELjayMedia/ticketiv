import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const migrationsDir = join(process.cwd(), "supabase/migrations")

/**
 * Ticketiv compacted its historical migrations into a production baseline on
 * 5 September 2026. The baseline is a `pg_dump` of production, so it states the
 * schema in dump form — every identifier double-quoted, keywords upper-cased,
 * constraints and grants split out of the `create table` block — rather than in
 * the hand-written form the original migrations used.
 *
 * Contract tests therefore assert against the *canonical chain* (every file in
 * `supabase/migrations`, in execution order) through the accessors below, which
 * normalise dump syntax and extract whole objects. They must never depend on a
 * migration filename or on the incidental byte layout of the dump.
 */

/** The canonical migration chain, verbatim, in execution order. */
export function readMigrationChain(): string {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(migrationsDir, name), "utf8"))
    .join("\n\n")
}

type Region = "sql" | "string" | "dollar" | "line-comment" | "block-comment"

/**
 * Walk SQL, reporting which region each character belongs to.
 *
 * Only characters in the `sql` region are rewritten by `normalizeSql` or treated
 * as statement terminators — string literals, dollar-quoted function bodies and
 * comments are passed through untouched, so a `;` or a quote inside a PL/pgSQL
 * body never splits a statement.
 */
function* scan(sql: string): Generator<{ index: number; char: string; region: Region }> {
  let index = 0

  while (index < sql.length) {
    const rest = sql.slice(index)

    if (rest.startsWith("--")) {
      const end = sql.indexOf("\n", index)
      const stop = end === -1 ? sql.length : end
      for (; index < stop; index += 1) {
        yield { index, char: sql[index], region: "line-comment" }
      }
      continue
    }

    if (rest.startsWith("/*")) {
      const end = sql.indexOf("*/", index + 2)
      const stop = end === -1 ? sql.length : end + 2
      for (; index < stop; index += 1) {
        yield { index, char: sql[index], region: "block-comment" }
      }
      continue
    }

    const dollarTag = /^\$[A-Za-z_]*\$/.exec(rest)
    if (dollarTag) {
      const tag = dollarTag[0]
      const end = sql.indexOf(tag, index + tag.length)
      const stop = end === -1 ? sql.length : end + tag.length
      for (; index < stop; index += 1) {
        yield { index, char: sql[index], region: "dollar" }
      }
      continue
    }

    if (sql[index] === "'") {
      const escaped = /(^|[^A-Za-z0-9_])[eE]$/.test(sql.slice(Math.max(0, index - 2), index))
      let cursor = index + 1

      while (cursor < sql.length) {
        if (escaped && sql[cursor] === "\\") {
          cursor += 2
          continue
        }
        if (sql[cursor] === "'") {
          if (sql[cursor + 1] === "'") {
            cursor += 2
            continue
          }
          cursor += 1
          break
        }
        cursor += 1
      }

      for (; index < Math.min(cursor, sql.length); index += 1) {
        yield { index, char: sql[index], region: "string" }
      }
      continue
    }

    yield { index, char: sql[index], region: "sql" }
    index += 1
  }
}

/**
 * The canonical chain with pg_dump syntax flattened: quoted identifiers
 * unwrapped and keywords lower-cased, outside of string literals, comments and
 * dollar-quoted bodies. `create table if not exists "public"."push_devices"`
 * and the hand-written `create table if not exists public.push_devices` become
 * the same text, so a contract reads the same whichever produced it.
 */
function normalizeSql(sql: string): string {
  let out = ""

  for (const { char, region } of scan(sql)) {
    if (region !== "sql") {
      out += char
      continue
    }
    if (char === '"') continue
    out += char.toLowerCase()
  }

  return out
}

let chainCache: string | null = null

/** The canonical chain in normalised form. Contract assertions read this. */
export function normalizedMigrationChain(): string {
  if (chainCache === null) chainCache = normalizeSql(readMigrationChain())
  return chainCache
}

let statementCache: string[] | null = null

/**
 * Drop the comment banner a statement carries from the line above it, so a
 * statement always starts with its own keyword.
 */
function stripLeadingComments(statement: string): string {
  let text = statement.trimStart()

  for (;;) {
    if (text.startsWith("--")) {
      const end = text.indexOf("\n")
      text = end === -1 ? "" : text.slice(end + 1).trimStart()
      continue
    }
    if (text.startsWith("/*")) {
      const end = text.indexOf("*/")
      text = end === -1 ? "" : text.slice(end + 2).trimStart()
      continue
    }
    return text.trim()
  }
}

/** The normalised chain split into statements on top-level semicolons. */
export function migrationStatements(): string[] {
  if (statementCache !== null) return statementCache

  const sql = normalizedMigrationChain()
  const statements: string[] = []
  let start = 0

  const push = (raw: string) => {
    const statement = stripLeadingComments(raw)
    if (statement) statements.push(statement)
  }

  for (const { index, char, region } of scan(sql)) {
    if (region === "sql" && char === ";") {
      push(sql.slice(start, index))
      start = index + 1
    }
  }

  push(sql.slice(start))

  statementCache = statements
  return statements
}

/** Every statement in the chain matching `pattern`, in execution order. */
export function migrationStatementsMatching(pattern: RegExp): string[] {
  return migrationStatements().filter((statement) => pattern.test(statement))
}

const identifier = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Every `create function` body for `public.<name>` in the chain, in execution
 * order, so an assertion sees the definition that actually ships — including a
 * later migration that replaces the baseline's version.
 */
export function migrationFunction(name: string): string {
  const bodies = migrationStatementsMatching(
    new RegExp(`^create (or replace )?function ${identifier(name)}\\s*\\(`),
  )

  if (bodies.length === 0) {
    throw new Error(`No create function statement for ${name} in the canonical migration chain`)
  }

  return bodies.join(";\n\n")
}

export interface FunctionGrants {
  /** Roles holding execute, in the order the chain grants them. */
  grantees: string[]
  /** True while the Postgres default `public` execute grant still stands. */
  publicExecute: boolean
}

const rolesIn = (clause: string) =>
  clause
    .split(",")
    .map((role) => role.trim().replace(/^group\s+/, ""))
    .filter(Boolean)

/**
 * Net execute privileges for `public.<name>`, replaying the chain's grants and
 * revokes in order. Functions are executable by `public` until something
 * revokes that, so both halves matter to a "service-role only" contract.
 */
export function migrationFunctionGrants(name: string): FunctionGrants {
  const statements = migrationStatementsMatching(
    new RegExp(`(grant|revoke)[\\s\\S]*\\son function ${identifier(name)}\\s*\\(`),
  )

  if (statements.length === 0) {
    throw new Error(`No grant or revoke on function ${name} in the canonical migration chain`)
  }

  const grantees = new Set<string>()
  let publicExecute = true

  for (const statement of statements) {
    const grant = /^grant\s+([\s\S]*?)\s+on function[\s\S]*?\s+to\s+([\s\S]+)$/.exec(statement)
    if (grant && /\ball\b|\bexecute\b/.test(grant[1])) {
      for (const role of rolesIn(grant[2])) {
        if (role === "public") publicExecute = true
        else grantees.add(role)
      }
      continue
    }

    const revoke = /^revoke\s+([\s\S]*?)\s+on function[\s\S]*?\s+from\s+([\s\S]+)$/.exec(statement)
    if (revoke && /\ball\b|\bexecute\b/.test(revoke[1])) {
      for (const role of rolesIn(revoke[2])) {
        if (role === "public") publicExecute = false
        else grantees.delete(role)
      }
    }
  }

  return { grantees: [...grantees], publicExecute }
}

/**
 * Net table privileges per role, replaying the chain's grants and revokes.
 * `grant all` expands so a caller can ask for one privilege by name.
 */
export function migrationTableGrants(table: string): Record<string, string[]> {
  const ALL = ["select", "insert", "update", "delete", "truncate", "references", "trigger"]
  const statements = migrationStatementsMatching(
    new RegExp(`(grant|revoke)[\\s\\S]*\\son (table )?${identifier(table)}\\b`),
  )
  const held = new Map<string, Set<string>>()

  const privilegesIn = (clause: string) =>
    /\ball\b/.test(clause) ? ALL : ALL.filter((privilege) => new RegExp(`\\b${privilege}\\b`).test(clause))

  for (const statement of statements) {
    const grant = /^grant\s+([\s\S]*?)\s+on (?:table )?[\s\S]*?\s+to\s+([\s\S]+)$/.exec(statement)
    if (grant) {
      for (const role of rolesIn(grant[2])) {
        const current = held.get(role) ?? new Set<string>()
        privilegesIn(grant[1]).forEach((privilege) => current.add(privilege))
        held.set(role, current)
      }
      continue
    }

    const revoke = /^revoke\s+([\s\S]*?)\s+on (?:table )?[\s\S]*?\s+from\s+([\s\S]+)$/.exec(statement)
    if (revoke) {
      for (const role of rolesIn(revoke[2])) {
        const current = held.get(role)
        if (!current) continue
        privilegesIn(revoke[1]).forEach((privilege) => current.delete(privilege))
        if (current.size === 0) held.delete(role)
      }
    }
  }

  return Object.fromEntries([...held].map(([role, privileges]) => [role, [...privileges]]))
}

/**
 * The `create table` statement for `public.<name>` plus every constraint,
 * index, policy, trigger, grant and comment the chain attaches to it. pg_dump
 * splits these apart, so a table contract has to gather them back up.
 */
export function migrationTable(table: string): string {
  const name = identifier(table)
  const statements = migrationStatementsMatching(
    new RegExp(
      `^(create (table|unique index|index|policy|trigger)|alter table( only)?|comment on (table|column|constraint|index|policy)|grant|revoke)[\\s\\S]*\\b${name}\\b`,
    ),
  )

  if (statements.length === 0) {
    throw new Error(`No table statements for ${table} in the canonical migration chain`)
  }

  return statements.join(";\n\n")
}

/** The column definition for `<column>` inside `public.<table>`'s create statement. */
export function migrationColumn(table: string, column: string): string {
  const [create] = migrationStatementsMatching(
    new RegExp(`^create table (if not exists )?${identifier(table)}\\s*\\(`),
  )

  if (!create) {
    throw new Error(`No create table statement for ${table} in the canonical migration chain`)
  }

  const body = create.slice(create.indexOf("(") + 1)
  let depth = 0
  let current = ""
  const columns: string[] = []

  for (const char of body) {
    if (char === "(") depth += 1
    if (char === ")") {
      if (depth === 0) break
      depth -= 1
    }
    if (char === "," && depth === 0) {
      columns.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  if (current.trim()) columns.push(current.trim())

  const definition = columns.find((entry) => new RegExp(`^${identifier(column)}\\b`).test(entry))

  if (!definition) {
    throw new Error(`No column ${column} on ${table} in the canonical migration chain`)
  }

  return definition
}

export interface CronJob {
  name: string
  schedule: string
  command: string
}

/**
 * Every pg_cron job the chain schedules. A `pg_dump` of the public schema
 * cannot carry `cron.job` rows, so scheduled behaviour is declared by migration
 * and this is the only place a schedule contract can read it from.
 */
export function migrationCronJobs(): CronJob[] {
  const jobs = new Map<string, CronJob>()
  const pattern =
    /cron\.schedule\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(?:\$[a-z_]*\$([\s\S]*?)\$[a-z_]*\$|'([\s\S]*?)')\s*\)/g

  for (const match of normalizedMigrationChain().matchAll(pattern)) {
    const [, name, schedule, dollarBody, quotedBody] = match
    jobs.set(name, { name, schedule, command: (dollarBody ?? quotedBody ?? "").trim() })
  }

  return [...jobs.values()]
}

/** The job scheduled under `name`, or undefined when the chain never schedules it. */
export function migrationCronJob(name: string): CronJob | undefined {
  return migrationCronJobs().find((job) => job.name === name)
}

/**
 * A bounded section of the normalised chain around a semantic marker. Prefer the
 * object accessors above; this stays for contracts anchored on a distinctive
 * fragment inside a single statement.
 */
export function migrationContractAround(marker: string, before = 1_000, after = 12_000): string {
  const sql = normalizedMigrationChain()
  const index = sql.indexOf(marker.toLowerCase())

  if (index < 0) {
    throw new Error(`Migration contract marker not found: ${marker}`)
  }

  return sql.slice(Math.max(0, index - before), Math.min(sql.length, index + after))
}
