#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const TABLES = ['orders', 'payments', 'payouts', 'ledger_entries', 'refunds']
const PAGE_SIZE = 500

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required.`)
  return value
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || requiredEnv('SUPABASE_URL')
const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
const client = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const result = { format: 1, tables: {} }
for (const table of TABLES) {
  const digest = createHash('sha256')
  let count = 0
  let from = 0

  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`Unable to fingerprint ${table}.`)

    for (const row of data ?? []) {
      digest.update(JSON.stringify(row))
      digest.update('\n')
      count += 1
    }
    if ((data?.length ?? 0) < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  result.tables[table] = { count, sha256: digest.digest('hex') }
}

process.stdout.write(`${JSON.stringify(result)}\n`)
