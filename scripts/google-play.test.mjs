import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

import {
  downloadImage, exportListing, parseArguments, playClient, promoteBundle,
  promotionInputs, syncListing, withEdit,
} from "./google-play.mjs"
import { APPS, loadListing } from "./validate-play-listings.mjs"

const DIGEST = "a".repeat(64)
const text = { title: "Ticketiv", shortDescription: "Event tickets together.", fullDescription: "Browse events and keep your delivered tickets together." }
function pngHeader(width, height) {
  const header = Buffer.alloc(33)
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header)
  header.write("IHDR", 12)
  header.writeUInt32BE(width, 16)
  header.writeUInt32BE(height, 20)
  return header
}

function listing(imagePolicy = "preserve-existing") {
  return { packageName: "com.ticketiv.app", defaultLanguage: "en-US", imagePolicy, listings: { "en-US": text }, images: { "en-US": { icon: [], featureGraphic: [], phoneScreenshots: [] } } }
}

function mockPlay(overrides = {}) {
  const calls = []
  const downloads = []
  const counts = { icon: 1, featureGraphic: 1, phoneScreenshots: 2 }
  const handler = async (path, options = {}) => {
    const method = options.method ?? "GET"
    calls.push({ path, ...options, method })
    if (overrides.handler) {
      const result = await overrides.handler(path, { ...options, method })
      if (result !== undefined) return result
    }
    if (path === "edits") return { id: "edit-1" }
    if (path === "edits/edit-1/details") return { defaultLanguage: "en-US" }
    if (path === "edits/edit-1/listings") return { listings: [{ language: "en-US", ...text }] }
    if (path === "edits/edit-1/tracks/internal") return overrides.internal ?? { releases: [{ status: "completed", versionCodes: ["100"], releaseNotes: [{ language: "en-US", text: "Ticket scanning improvements." }] }] }
    if (path === "edits/edit-1/bundles") return overrides.bundles ?? { bundles: [{ versionCode: 100, sha256: DIGEST }] }
    if (path === "edits/edit-1/tracks/production" && method === "GET") return overrides.production ?? { releases: [] }
    const type = path.split("/").at(-1)
    if (method === "GET" && Object.hasOwn(counts, type)) {
      return { images: Array.from({ length: counts[type] }, (_, index) => ({ url: `https://play-lh.googleusercontent.com/${type}-${index}=w600` })) }
    }
    return {}
  }
  const fetcher = async (url, options) => {
    downloads.push({ url: String(url), options })
    const type = Object.keys(counts).find((candidate) => String(url).includes(`/${candidate}-`))
    assert.ok(type, `unexpected image URL: ${url}`)
    const dimensions = type === "icon" ? [512, 512] : type === "featureGraphic" ? [1024, 500] : [720, 1280]
    return new Response(pngHeader(...dimensions))
  }
  return { client: handler, fetcher, calls, downloads }
}

function committed(calls) { return calls.some((call) => call.path.endsWith(":commit")) }
function deletedEdit(calls) { return calls.some((call) => call.path === "edits/edit-1" && call.method === "DELETE") }

test("preserved-artwork sync checks approved remote images before updating text and committing", async () => {
  const mock = mockPlay()
  await syncListing(mock.client, listing(), mock.fetcher)
  assert.equal(mock.downloads.length, 4)
  assert.ok(mock.downloads.every((download) => download.url.endsWith("=s0")))
  assert.ok(mock.downloads.every((download) => download.options.redirect === "error"))
  assert.ok(mock.calls.findIndex((call) => call.method === "PATCH") > mock.calls.findIndex((call) => call.path.endsWith("/phoneScreenshots")))
  assert.deepEqual(mock.calls.find((call) => call.path.endsWith("/listings/en-US") && call.method === "PUT").body, text)
  assert.deepEqual(mock.calls.find((call) => call.method === "PATCH").body, { defaultLanguage: "en-US" })
  assert.ok(committed(mock.calls))
  assert.ok(mock.calls.findIndex((call) => call.path.endsWith(":validate")) < mock.calls.findIndex((call) => call.path.endsWith(":commit")))
  assert.ok(!mock.calls.some((call) => call.method === "DELETE"), "preservation never deletes artwork")
})

test("missing approved Console artwork blocks all updates and cleans up the edit", async () => {
  const mock = mockPlay({ handler: (path) => path.endsWith("/phoneScreenshots") ? { images: [] } : undefined })
  await assert.rejects(syncListing(mock.client, listing(), mock.fetcher), /requires 2–8 approved images/)
  assert.ok(!committed(mock.calls))
  assert.ok(!mock.calls.some((call) => ["PATCH", "PUT"].includes(call.method)))
  assert.ok(deletedEdit(mock.calls))
})

test("invalid remote image content blocks publication and cleans up the edit", async () => {
  const mock = mockPlay()
  await assert.rejects(syncListing(mock.client, listing(), async () => new Response("not an image")), /PNG or JPEG/)
  assert.ok(!committed(mock.calls))
  assert.ok(deletedEdit(mock.calls))
})

test("image downloads reject unrelated hosts, redirects, oversized streams and HTTP errors", async () => {
  for (const url of ["http://play-lh.googleusercontent.com/icon", "https://googleusercontent.com.evil.example/icon", "https://example.com/icon"]) {
    await assert.rejects(downloadImage({ url }, "icon", () => { throw new Error("must not fetch") }), /Google HTTPS image URL/)
  }
  await assert.rejects(downloadImage({ url: "https://play-lh.googleusercontent.com/icon" }, "icon", async () => new Response(null, { status: 403 })), /403/)
  await assert.rejects(downloadImage({ url: "https://play-lh.googleusercontent.com/icon" }, "icon", async () => new Response("", { headers: { "content-length": String(1024 * 1024 + 1) } })), /size limit/)
  await assert.rejects(downloadImage({ url: "https://play-lh.googleusercontent.com/icon" }, "icon", async () => new Response(Buffer.alloc(1024 * 1024 + 1))), /size limit/)
})

test("replacement uploads ordered binary files through the media endpoint", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "play-sync-"))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const localListing = listing("replace")
  for (const [type, count] of [["icon", 1], ["featureGraphic", 1], ["phoneScreenshots", 2]]) {
    for (let index = 0; index < count; index++) {
      const path = join(directory, `${type}-${index}.png`)
      await writeFile(path, Buffer.from(`${type}-${index}`))
      localListing.images["en-US"][type].push({ path, mimeType: "image/png" })
    }
  }
  const mock = mockPlay()
  await syncListing(mock.client, localListing, mock.fetcher)
  assert.equal(mock.downloads.length, 0)
  const deletes = mock.calls.filter((call) => call.method === "DELETE")
  assert.deepEqual(deletes.map((call) => call.path), ["edits/edit-1/listings/en-US/icon", "edits/edit-1/listings/en-US/featureGraphic", "edits/edit-1/listings/en-US/phoneScreenshots"])
  const uploads = mock.calls.filter((call) => call.upload)
  assert.equal(uploads.length, 4)
  assert.ok(uploads.every((call) => call.method === "POST" && call.path.endsWith("?uploadType=media") && call.mimeType === "image/png" && Buffer.isBuffer(call.body)))
  assert.deepEqual(uploads.slice(-2).map((call) => call.body.toString()), ["phoneScreenshots-0", "phoneScreenshots-1"])
  assert.ok(committed(mock.calls))
})

test("Play HTTP client uses authenticated upload and JSON endpoints correctly", async () => {
  const requests = []
  const client = playClient("com.ticketiv.app", "mock-token", async (url, options) => {
    requests.push({ url, options })
    return new Response("{}", { status: 200 })
  })
  await client("edits/e/listings/en-US/icon?uploadType=media", { method: "POST", upload: true, mimeType: "image/png", body: Buffer.from("image") })
  await client("edits/e/listings/en-US", { method: "PUT", body: text })
  assert.equal(requests[0].url, "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/com.ticketiv.app/edits/e/listings/en-US/icon?uploadType=media")
  assert.equal(requests[0].options.headers.Authorization, "Bearer mock-token")
  assert.equal(requests[0].options.headers["Content-Type"], "image/png")
  assert.ok(Buffer.isBuffer(requests[0].options.body))
  assert.equal(requests[1].options.body, JSON.stringify(text))
  const failing = playClient("com.ticketiv.app", "mock-token", async () => new Response("private Google response", { status: 403 }))
  await assert.rejects(failing("edits/e"), (error) => error.message.includes("403") && !error.message.includes("private Google response"))
})

test("Console export writes a complete replace manifest and only reads/deletes its temporary edit", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "play-export-"))
  t.after(() => rm(root, { recursive: true, force: true }))
  const output = join(root, APPS.ticketiv.directory)
  const mock = mockPlay()
  const manifest = await exportListing(mock.client, "ticketiv", output, mock.fetcher)
  assert.equal(manifest.imagePolicy, "replace")
  assert.equal(manifest.images["en-US"].phoneScreenshots.length, 2)
  assert.ok(!committed(mock.calls))
  assert.ok(deletedEdit(mock.calls))
  assert.ok(mock.calls.every((call) => call.method === "GET" || (call.path === "edits" && call.method === "POST") || (call.path === "edits/edit-1" && call.method === "DELETE")))
  assert.match(await readFile(join(output, "IMPORT.md"), "utf8"), /makes no Play changes/)
  const loaded = await loadListing("ticketiv", { root, requireImages: true })
  assert.equal(loaded.images["en-US"].featureGraphic[0].width, 1024)
  assert.deepEqual(loaded.listings["en-US"], text)
})

test("failed exports clean up their temporary edit without committing", async (t) => {
  const output = await mkdtemp(join(tmpdir(), "play-export-failed-"))
  t.after(() => rm(output, { recursive: true, force: true }))
  const mock = mockPlay({ handler: (path) => path.endsWith("/icon") ? { images: [] } : undefined })
  await assert.rejects(exportListing(mock.client, "ticketiv", output, mock.fetcher), /approved images/)
  assert.ok(deletedEdit(mock.calls))
  assert.ok(!committed(mock.calls))
})

test("promotion requires an internal version and receipt digest, preserves completed production versions and stages rollout", async () => {
  const oldRelease = { status: "completed", versionCodes: ["90"] }
  const mock = mockPlay({ production: { releases: [oldRelease] }, bundles: { bundles: [{ versionCode: 100, sha256: DIGEST.toUpperCase() }] } })
  await promoteBundle(mock.client, { versionCode: 100, bundleSha256: DIGEST, userFraction: 0.1 })
  const update = mock.calls.find((call) => call.path.endsWith("/tracks/production") && call.method === "PUT")
  assert.deepEqual(update.body, { track: "production", releases: [oldRelease, {
    name: "Verified 100", versionCodes: ["100"], status: "inProgress", userFraction: 0.1,
    releaseNotes: [{ language: "en-US", text: "Ticket scanning improvements." }],
  }] })
  assert.ok(committed(mock.calls))
})

test("listing changes and verified production promotion use one atomic edit and commit", async () => {
  const mock = mockPlay()
  await promoteBundle(mock.client, { versionCode: 100, bundleSha256: DIGEST, userFraction: 0.1 }, listing(), mock.fetcher)
  assert.equal(mock.calls.filter((call) => call.path === "edits" && call.method === "POST").length, 1)
  assert.equal(mock.calls.filter((call) => call.path.endsWith(":validate")).length, 1)
  assert.equal(mock.calls.filter((call) => call.path.endsWith(":commit")).length, 1)
  const textUpdate = mock.calls.findIndex((call) => call.path.endsWith("/listings/en-US") && call.method === "PUT")
  const trackUpdate = mock.calls.findIndex((call) => call.path.endsWith("/tracks/production") && call.method === "PUT")
  const commit = mock.calls.findIndex((call) => call.path.endsWith(":commit"))
  assert.ok(textUpdate > mock.calls.findIndex((call) => call.path.endsWith("/bundles")))
  assert.ok(textUpdate < trackUpdate && trackUpdate < commit)
  assert.ok(!mock.calls.some((call) => call.method === "DELETE"))
  assert.equal(mock.downloads.length, 4)
})

test("a mismatched bundle cannot update metadata as a side effect of promotion", async () => {
  const mock = mockPlay({ bundles: { bundles: [{ versionCode: 100, sha256: "b".repeat(64) }] } })
  await assert.rejects(promoteBundle(mock.client, { versionCode: 100, bundleSha256: DIGEST, userFraction: 0.1 }, listing(), mock.fetcher), /digest does not match/)
  assert.ok(!mock.calls.some((call) => ["PATCH", "PUT"].includes(call.method)))
  assert.equal(mock.downloads.length, 0)
  assert.ok(!committed(mock.calls))
  assert.ok(deletedEdit(mock.calls))
})

test("missing preserved artwork aborts atomic promotion before updating its track", async () => {
  const mock = mockPlay({ handler: (path) => path.endsWith("/phoneScreenshots") ? { images: [] } : undefined })
  await assert.rejects(promoteBundle(mock.client, { versionCode: 100, bundleSha256: DIGEST, userFraction: 0.1 }, listing(), mock.fetcher), /approved images/)
  assert.ok(!mock.calls.some((call) => ["PATCH", "PUT"].includes(call.method)))
  assert.ok(!committed(mock.calls))
  assert.ok(deletedEdit(mock.calls))
})

test("promotion rejects missing internal membership and altered bundles before touching production", async () => {
  for (const overrides of [
    { internal: { releases: [{ status: "draft", versionCodes: ["100"] }] } },
    { internal: { releases: [{ status: "completed", versionCodes: ["99"] }] } },
    { bundles: { bundles: [{ versionCode: 100, sha256: "b".repeat(64) }] } },
    { bundles: { bundles: [] } },
  ]) {
    const mock = mockPlay(overrides)
    await assert.rejects(promoteBundle(mock.client, { versionCode: 100, bundleSha256: DIGEST, userFraction: 0.1 }), /not a completed internal|digest does not match/)
    assert.ok(!mock.calls.some((call) => call.path.endsWith("/tracks/production") && call.method === "PUT"))
    assert.ok(!committed(mock.calls))
    assert.ok(deletedEdit(mock.calls))
  }
})

test("promotion refuses repeated versions, downgrades and any unfinished production rollout", async () => {
  for (const release of [
    { status: "completed", versionCodes: ["100"] },
    { status: "completed", versionCodes: ["101"] },
    { status: "draft", versionCodes: ["90"] },
    { status: "inProgress", versionCodes: ["90"] },
    { status: "halted", versionCodes: ["90"] },
  ]) {
    const mock = mockPlay({ production: { releases: [release] } })
    await assert.rejects(promoteBundle(mock.client, { versionCode: 100, bundleSha256: DIGEST, userFraction: 0.1 }), /repeat or downgrade|finish it in Console/)
    assert.ok(!committed(mock.calls))
    assert.ok(deletedEdit(mock.calls))
  }
})

test("promotion inputs and CLI arguments fail closed", () => {
  assert.deepEqual(promotionInputs({ versionCode: "100", bundleSha256: DIGEST, userFraction: "0.1" }), { versionCode: "100", bundleSha256: DIGEST, userFraction: 0.1 })
  for (const versionCode of [0, -1, "01", "1.1", "1e3", "2100000001", "x"]) {
    assert.throws(() => promotionInputs({ versionCode, bundleSha256: DIGEST, userFraction: 0.1 }), /Invalid version code/)
  }
  for (const userFraction of [undefined, 0, 1, -1, "NaN", "Infinity", "0.1garbage"]) {
    assert.throws(() => promotionInputs({ versionCode: 100, bundleSha256: DIGEST, userFraction }), /staged fraction/)
  }
  assert.throws(() => promotionInputs({ versionCode: 100, bundleSha256: "invalid", userFraction: 0.1 }), /SHA-256/)
  assert.deepEqual(parseArguments(["sync", "--app", "ticketiv"]), { operation: "sync", options: { app: "ticketiv" } })
  for (const args of [[], ["publish"], ["sync", "--app", "other"], ["sync", "--app", "ticketiv", "--app", "access"], ["sync", "--app"], ["sync", "--app", "ticketiv", "--output", "somewhere"], ["export", "--app", "ticketiv"]]) {
    assert.throws(() => parseArguments(args))
  }
})

test("failed operations and failed validations clean up edits and retain the original error", async () => {
  const mock = mockPlay({ handler: (path, options) => {
    if (path.endsWith(":validate")) throw new Error("validation rejected")
    if (path === "edits/edit-1" && options.method === "DELETE") throw new Error("cleanup failed")
  } })
  await assert.rejects(withEdit(mock.client, async () => {}, true), /validation rejected/)
  assert.ok(!committed(mock.calls))
  assert.ok(deletedEdit(mock.calls))
})
