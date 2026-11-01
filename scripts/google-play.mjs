import { createSign } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { APPS, IMAGE_TYPES, inspectImage, loadListing } from "./validate-play-listings.mjs"

const API = "https://androidpublisher.googleapis.com/androidpublisher/v3"
const UPLOAD = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3"
function check(ok, message) { if (!ok) throw new Error(message) }

export async function authenticate(credentials, fetcher = fetch) {
  check(credentials.client_email && credentials.private_key, "Invalid Google Play service account credentials")
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url")
  const now = Math.floor(Date.now() / 1000)
  const payload = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: credentials.client_email, scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  })}`
  const signer = createSign("RSA-SHA256")
  signer.update(payload)
  const assertion = `${payload}.${signer.sign(credentials.private_key, "base64url")}`
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST", body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(30000),
  })
  check(response.ok, `Google authentication failed (${response.status})`)
  const result = await response.json()
  check(result.access_token, "Google did not return an access token")
  if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${result.access_token}`)
  return result.access_token
}

export function playClient(packageName, token, fetcher = fetch) {
  return async (path, { method = "GET", body, upload = false, mimeType } = {}) => {
    const response = await fetcher(`${upload ? UPLOAD : API}/applications/${packageName}/${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": mimeType ?? "application/json" }) },
      body: body === undefined ? undefined : mimeType ? body : JSON.stringify(body), signal: AbortSignal.timeout(120000),
    })
    check(response.ok, `Google Play ${method} ${path} failed (${response.status}); no automatic review-policy override is attempted`)
    const text = await response.text()
    return text.trim() ? JSON.parse(text) : {}
  }
}

export async function withEdit(client, operation, commit = false) {
  const edit = await client("edits", { method: "POST", body: {} })
  check(/^[A-Za-z0-9_-]+$/.test(edit.id ?? ""), "Google returned an invalid edit ID")
  let committed = false
  try {
    const result = await operation(`edits/${edit.id}`)
    if (commit) {
      await client(`edits/${edit.id}:validate`, { method: "POST" })
      await client(`edits/${edit.id}:commit`, { method: "POST" })
      committed = true
    }
    return result
  } finally {
    if (!committed) await client(`edits/${edit.id}`, { method: "DELETE" }).catch(() => {})
  }
}

export async function downloadImage(image, type, fetcher = fetch) {
  const url = new URL(image.url)
  check(url.protocol === "https:" && /(^|\.)googleusercontent\.com$/.test(url.hostname), "Play image URL must be a Google HTTPS image URL")
  // Request original artwork rather than a CDN thumbnail.
  url.pathname = url.pathname.replace(/=[^/]*$/, "") + "=s0"
  const response = await fetcher(url, { signal: AbortSignal.timeout(30000), redirect: "error" })
  check(response.ok, `Unable to download approved ${type} (${response.status})`)
  const max = type === "icon" ? 1024 * 1024 : 8 * 1024 * 1024
  check(!response.headers.get("content-length") || Number(response.headers.get("content-length")) <= max, "Play artwork exceeds the size limit")
  const chunks = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    check(size <= max, "Play artwork exceeds the size limit")
    chunks.push(chunk)
  }
  const bytes = Buffer.concat(chunks)
  return { bytes, ...inspectImage(bytes, type, `Console ${type}`) }
}

async function imageInventory(client, edit, locale, type, fetcher) {
  const inventory = await client(`${edit}/listings/${locale}/${type}`)
  const images = inventory.images ?? []
  const min = type === "phoneScreenshots" ? 2 : 1
  const max = type === "phoneScreenshots" ? 8 : 1
  check(images.length >= min && images.length <= max, `Console ${locale}/${type} requires ${min}–${max} approved images`)
  const downloaded = []
  for (const image of images) downloaded.push(await downloadImage(image, type, fetcher))
  return downloaded
}

async function applyListing(client, edit, listing, fetcher) {
  // Check every preserved asset before making any changes in the edit.
  if (listing.imagePolicy === "preserve-existing") {
    for (const locale of Object.keys(listing.listings)) {
      for (const type of IMAGE_TYPES) await imageInventory(client, edit, locale, type, fetcher)
    }
  }
  await client(`${edit}/details`, { method: "PATCH", body: { defaultLanguage: listing.defaultLanguage } })
  for (const [locale, text] of Object.entries(listing.listings)) {
    await client(`${edit}/listings/${locale}`, { method: "PUT", body: text })
    if (listing.imagePolicy === "replace") {
      for (const type of IMAGE_TYPES) {
        await client(`${edit}/listings/${locale}/${type}`, { method: "DELETE" })
        for (const image of listing.images[locale][type]) {
          await client(`${edit}/listings/${locale}/${type}?uploadType=media`, {
            method: "POST", upload: true, body: await readFile(image.path), mimeType: image.mimeType,
          })
        }
      }
    }
  }
}

export async function syncListing(client, listing, fetcher = fetch) {
  return withEdit(client, (edit) => applyListing(client, edit, listing, fetcher), true)
}

export async function exportListing(client, app, output, fetcher = fetch) {
  check(Object.hasOwn(APPS, app), "Unsupported Play app")
  await mkdir(output, { recursive: true })
  return withEdit(client, async (edit) => {
    const details = await client(`${edit}/details`)
    const response = await client(`${edit}/listings`)
    const internal = await client(`${edit}/tracks/internal`)
    const notes = internal.releases?.find((r) => r.status === "completed")?.releaseNotes ?? []
    const manifest = { packageName: APPS[app].packageName, defaultLanguage: details.defaultLanguage, imagePolicy: "replace", listings: {}, images: {} }
    check(Array.isArray(response.listings) && response.listings.length > 0, "Console listing has no text")
    for (const listing of response.listings) {
      const locale = listing.language
      check(/^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|-[0-9]{3})?$/.test(locale), "Invalid Console locale")
      manifest.listings[locale] = Object.fromEntries(["title", "shortDescription", "fullDescription"].map((key) => [key, listing[key]]))
      manifest.images[locale] = {}
      for (const type of IMAGE_TYPES) {
        const images = await imageInventory(client, edit, locale, type, fetcher)
        manifest.images[locale][type] = []
        for (const [index, image] of images.entries()) {
          const path = `images/${locale}/${type}-${index + 1}.${image.mimeType === "image/png" ? "png" : "jpg"}`
          await mkdir(resolve(output, "images", locale), { recursive: true })
          await writeFile(resolve(output, path), image.bytes)
          manifest.images[locale][type].push(path)
        }
      }
      const note = notes.find((r) => r.language === locale)?.text
      // Do not invent release notes for translations not in the internal release.
      if (note) {
        await mkdir(resolve(output, "whatsnew"), { recursive: true })
        await writeFile(resolve(output, "whatsnew", `whatsnew-${locale}`), `${note}\n`)
      }
    }
    await writeFile(resolve(output, "listing.json"), `${JSON.stringify(manifest, null, 2)}\n`)
    await writeFile(resolve(output, "IMPORT.md"), "Copy listing.json and images/ into the app's store-listing directory. Review all text and images before committing. Keep existing whatsnew/ release notes; add a whatsnew-LOCALE file for any newly imported locale. Run pnpm check:play before submitting. This export makes no Play changes.\n")
    return manifest
  })
}

export function promotionInputs({ versionCode, bundleSha256, userFraction }) {
  check(/^[1-9][0-9]*$/.test(String(versionCode)) && Number.isSafeInteger(Number(versionCode)) && Number(versionCode) <= 2100000000, "Invalid version code")
  check(/^[a-f0-9]{64}$/.test(bundleSha256 ?? ""), "A verified bundle SHA-256 is required")
  const fraction = Number(userFraction)
  check(Number.isFinite(fraction) && fraction > 0 && fraction < 1, "Production requires a staged fraction strictly between 0 and 1")
  return { versionCode: String(versionCode), bundleSha256, userFraction: fraction }
}

export async function promoteBundle(client, options, listing = null, fetcher = fetch) {
  const { versionCode, bundleSha256, userFraction } = promotionInputs(options)
  return withEdit(client, async (edit) => {
    const internal = await client(`${edit}/tracks/internal`)
    const release = internal.releases?.find((r) => r.status === "completed" && r.versionCodes?.map(String).includes(versionCode))
    check(release, "Verified version is not a completed internal-testing release")
    const bundles = await client(`${edit}/bundles`)
    const bundle = bundles.bundles?.find((b) => String(b.versionCode) === versionCode)
    check(bundle?.sha256?.toLowerCase() === bundleSha256, "Play bundle digest does not match the signed release receipt")
    const production = await client(`${edit}/tracks/production`)
    const previous = production.releases ?? []
    check(previous.every((r) => r.status === "completed"), "Production has an active, halted or draft rollout; finish it in Console first")
    check(previous.every((r) => r.versionCodes?.every((code) => Number(code) < Number(versionCode))), "Refusing to repeat or downgrade a production version")
    if (listing) await applyListing(client, edit, listing, fetcher)
    await client(`${edit}/tracks/production`, { method: "PUT", body: {
      track: "production", releases: [...previous, {
        name: `Verified ${versionCode}`, versionCodes: [versionCode], status: "inProgress", userFraction,
        ...(release.releaseNotes ? { releaseNotes: release.releaseNotes } : {}),
      }],
    } })
  }, true)
}

export function parseArguments(argv) {
  const operation = argv[0]
  check(["export", "sync", "promote"].includes(operation), "Expected export, sync or promote")
  const allowed = { export: ["app", "output"], sync: ["app"], promote: ["app", "version-code", "bundle-sha256", "user-fraction"] }[operation]
  const options = {}
  for (let i = 1; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "")
    check(argv[i].startsWith("--") && allowed.includes(key) && argv[i + 1] && !argv[i + 1].startsWith("--") && !Object.hasOwn(options, key), `Invalid argument ${argv[i]}`)
    options[key] = argv[i + 1]
  }
  check(Object.hasOwn(APPS, options.app), "--app must be ticketiv or access")
  check(operation !== "export" || options.output, "--output is required for export")
  return { operation, options }
}

async function main() {
  const { operation, options } = parseArguments(process.argv.slice(2))
  const listing = ["sync", "promote"].includes(operation) ? await loadListing(options.app, { requireImages: true }) : null
  const promotion = operation === "promote" ? promotionInputs({ versionCode: options["version-code"], bundleSha256: options["bundle-sha256"], userFraction: options["user-fraction"] }) : null
  check(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is required")
  const token = await authenticate(JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON))
  const client = playClient(APPS[options.app].packageName, token)
  if (operation === "sync") await syncListing(client, listing)
  if (operation === "export") await exportListing(client, options.app, resolve(options.output))
  if (operation === "promote") await promoteBundle(client, promotion, listing)
  console.log(`Google Play ${operation} succeeded for ${options.app}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
