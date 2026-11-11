#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const destination = process.argv[2]

if (!baseUrl || !serviceRoleKey || !destination) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and a destination are required')
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
  if (!response.ok) {
    throw new Error(`Storage API request failed with HTTP ${response.status}`)
  }
  return response.json()
}

function safeRelativePath(value) {
  if (!value || path.isAbsolute(value) || value.split('/').includes('..')) {
    throw new Error('Storage object path is unsafe')
  }
  return value
}

function encodedObjectPath(value) {
  return value.split('/').map(encodeURIComponent).join('/')
}

async function listDirectory(bucketId, prefix = '') {
  const all = []
  let offset = 0

  while (true) {
    const page = await requestJson(
      `${baseUrl}/storage/v1/object/list/${encodeURIComponent(bucketId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }),
      },
    )
    all.push(...page)
    if (page.length < 1000) break
    offset += page.length
  }

  const files = []
  for (const entry of all) {
    const objectPath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.id == null) {
      files.push(...await listDirectory(bucketId, objectPath))
    } else {
      files.push({ path: safeRelativePath(objectPath), metadata: entry.metadata ?? {} })
    }
  }
  return files
}

async function downloadObject(bucketId, objectPath) {
  const response = await fetch(
    `${baseUrl}/storage/v1/object/authenticated/${encodeURIComponent(bucketId)}/${encodedObjectPath(objectPath)}`,
    { headers },
  )
  if (!response.ok) {
    throw new Error(`Storage object download failed with HTTP ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

await mkdir(destination, { recursive: true, mode: 0o700 })
const buckets = await requestJson(`${baseUrl}/storage/v1/bucket`)
const manifest = {
  format: 1,
  createdAt: new Date().toISOString(),
  buckets: [],
  objects: [],
}

for (const bucket of buckets.sort((a, b) => a.id.localeCompare(b.id))) {
  const bucketId = safeRelativePath(bucket.id)
  const objects = await listDirectory(bucketId)
  let bucketBytes = 0

  for (const object of objects.sort((a, b) => a.path.localeCompare(b.path))) {
    const data = await downloadObject(bucketId, object.path)
    const outputPath = path.join(destination, 'objects', bucketId, object.path)
    await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 })
    await writeFile(outputPath, data, { mode: 0o600 })
    bucketBytes += data.length
    manifest.objects.push({
      bucketId,
      path: object.path,
      bytes: data.length,
      sha256: createHash('sha256').update(data).digest('hex'),
    })
  }

  manifest.buckets.push({
    id: bucketId,
    name: bucket.name,
    public: Boolean(bucket.public),
    fileSizeLimit: bucket.file_size_limit ?? null,
    allowedMimeTypes: bucket.allowed_mime_types ?? null,
    objectCount: objects.length,
    bytes: bucketBytes,
  })
}

await writeFile(
  path.join(destination, 'storage-manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { mode: 0o600 },
)

const totalBytes = manifest.objects.reduce((sum, object) => sum + object.bytes, 0)
process.stdout.write(`${JSON.stringify({ buckets: manifest.buckets.length, objects: manifest.objects.length, bytes: totalBytes })}\n`)
