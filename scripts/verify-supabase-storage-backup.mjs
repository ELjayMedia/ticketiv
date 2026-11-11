#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const backupDirectory = process.argv[2]
if (!backupDirectory) throw new Error('A Storage backup directory is required')

const manifestPath = path.join(backupDirectory, 'storage-manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (manifest.format !== 1 || !Array.isArray(manifest.buckets) || !Array.isArray(manifest.objects)) {
  throw new Error('Unsupported or invalid Storage backup manifest')
}

function safeRelativePath(value) {
  if (!value || path.isAbsolute(value) || value.split('/').includes('..')) {
    throw new Error('Storage manifest contains an unsafe path')
  }
  return value
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await listFiles(entryPath))
    else if (entry.isFile()) files.push(entryPath)
  }
  return files
}

let totalBytes = 0
for (const object of manifest.objects) {
  const bucketId = safeRelativePath(object.bucketId)
  const objectPath = safeRelativePath(object.path)
  const filePath = path.join(backupDirectory, 'objects', bucketId, objectPath)
  const fileStat = await stat(filePath)
  if (fileStat.size !== object.bytes) throw new Error('Storage object size mismatch')
  const digest = createHash('sha256').update(await readFile(filePath)).digest('hex')
  if (digest !== object.sha256) throw new Error('Storage object checksum mismatch')
  totalBytes += fileStat.size
}

const objectRoot = path.join(backupDirectory, 'objects')
const actualFiles = manifest.objects.length === 0 ? [] : await listFiles(objectRoot)
if (actualFiles.length !== manifest.objects.length) {
  throw new Error('Storage backup contains an unexpected number of object files')
}

process.stdout.write(`${JSON.stringify({
  buckets: manifest.buckets.length,
  objects: manifest.objects.length,
  bytes: totalBytes,
  checksumsValid: true,
})}\n`)
