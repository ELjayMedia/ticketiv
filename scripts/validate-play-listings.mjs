import { createHash } from "node:crypto"
import { readFile, realpath, stat } from "node:fs/promises"
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
export const APPS = Object.freeze({
  ticketiv: { packageName: "com.ticketiv.app", directory: "apps/ticketiv/store-listing" },
  access: { packageName: "com.ticketiv.access", directory: "apps/access/store-listing" },
})
export const IMAGE_TYPES = Object.freeze(["icon", "featureGraphic", "phoneScreenshots"])
const LOCALE = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2}|-[0-9]{3})?$/
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

function check(condition, message) {
  if (!condition) throw new Error(message)
}

function object(value, label) {
  check(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`)
}

function text(value, label, limit) {
  check(typeof value === "string" && value.trim().length > 0, `${label} must be nonempty text`)
  check(value === value.trim(), `${label} must not have leading or trailing whitespace`)
  check([...value].length <= limit, `${label} exceeds ${limit} characters`)
  check(!/\b(?:TODO|TBD|PLACEHOLDER|CHANGEME)\b/i.test(value), `${label} contains placeholder text`)
  check(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value), `${label} contains control characters`)
}

/** Read dimensions without adding an image-processing dependency to release jobs. */
export function imageDimensions(bytes) {
  if (bytes.length >= 33 && bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    check(bytes.toString("ascii", 12, 16) === "IHDR", "PNG is missing its IHDR header")
    const width = bytes.readUInt32BE(16)
    const height = bytes.readUInt32BE(20)
    check(width > 0 && height > 0, "PNG dimensions must be positive")
    return { width, height, mimeType: "image/png" }
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2
    while (offset < bytes.length) {
      check(bytes[offset] === 0xff, "Invalid JPEG marker")
      while (bytes[offset] === 0xff) offset++
      const marker = bytes[offset++]
      if (marker === 0xd9 || marker === 0xda) break
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      check(offset + 2 <= bytes.length, "Truncated JPEG segment")
      const length = bytes.readUInt16BE(offset)
      check(length >= 2 && offset + length <= bytes.length, "Truncated JPEG segment")
      if ([0xc0, 0xc1, 0xc2].includes(marker)) {
        check(length >= 8, "Truncated JPEG frame")
        const height = bytes.readUInt16BE(offset + 3)
        const width = bytes.readUInt16BE(offset + 5)
        check(width > 0 && height > 0, "JPEG dimensions must be positive")
        return { width, height, mimeType: "image/jpeg" }
      }
      offset += length
    }
    throw new Error("JPEG has no supported frame header")
  }
  throw new Error("Image must be a PNG or JPEG")
}

function within(parent, child) {
  const path = relative(parent, child)
  return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}

export function inspectImage(bytes, type, label = "image") {
  check(IMAGE_TYPES.includes(type), `Unsupported image type: ${type}`)
  const limit = type === "icon" ? 1024 * 1024 : 8 * 1024 * 1024
  check(bytes.length <= limit, `${label} exceeds ${limit} bytes`)
  const dimensions = imageDimensions(bytes)
  const { width, height, mimeType } = dimensions
  if (type === "icon") {
    check(mimeType === "image/png" && width === 512 && height === 512, `${label}: icon must be a 512 x 512 PNG`)
  } else if (type === "featureGraphic") {
    check(width === 1024 && height === 500, `${label}: feature graphic must be 1024 x 500`)
  } else {
    check(Math.min(width, height) >= 320 && Math.max(width, height) <= 3840, `${label}: screenshot dimensions must be between 320 and 3840 pixels`)
    check(Math.max(width, height) <= 2 * Math.min(width, height), `${label}: screenshot aspect ratio must not exceed 2:1`)
  }
  return { ...dimensions, sha256: createHash("sha256").update(bytes).digest("hex") }
}

async function loadImage(directory, filename, type) {
  check(typeof filename === "string" && filename.length > 0, `${type} image path must be nonempty text`)
  check(!isAbsolute(filename) && !filename.includes("\\"), `${type} image must use a relative path`)
  const path = resolve(directory, filename)
  check(within(directory, path), `${type} image must stay inside its store-listing directory`)
  const actual = await realpath(path)
  const actualDirectory = await realpath(directory)
  check(within(actualDirectory, actual), `${type} image symlink must stay inside its store-listing directory`)
  const info = await stat(actual)
  check(info.isFile(), `${filename} must be a regular file`)
  check(info.size <= 8 * 1024 * 1024, `${filename} exceeds 8 MiB`)
  const bytes = await readFile(actual)
  return { path: actual, relativePath: filename, ...inspectImage(bytes, type, filename) }
}

/**
 * preserve-existing forbids local image changes: the API client must validate
 * the existing Console image inventory before committing a metadata edit.
 * replace requires complete local artwork when publishing with requireImages:true.
 */
export async function loadListing(app, { requireImages = false, root = REPO_ROOT } = {}) {
  check(Object.hasOwn(APPS, app), `Unsupported Play app: ${app}`)
  const config = APPS[app]
  const directory = resolve(root, config.directory)
  const manifest = JSON.parse(await readFile(resolve(directory, "listing.json"), "utf8"))
  object(manifest, `${app} listing manifest`)
  for (const key of Object.keys(manifest)) {
    check(["packageName", "defaultLanguage", "imagePolicy", "listings", "images"].includes(key), `Unknown listing manifest field: ${key}`)
  }
  check(manifest.packageName === config.packageName, `${app} packageName must be ${config.packageName}`)
  check(typeof manifest.defaultLanguage === "string" && LOCALE.test(manifest.defaultLanguage), "Invalid defaultLanguage")
  check(["preserve-existing", "replace"].includes(manifest.imagePolicy), "imagePolicy must explicitly be preserve-existing or replace")
  object(manifest.listings, "listings")
  object(manifest.images, "images")
  check(Object.hasOwn(manifest.listings, manifest.defaultLanguage), "defaultLanguage must have listing text")
  const listings = {}
  const images = {}
  const missingImages = []
  const releaseNotes = []
  for (const [locale, listing] of Object.entries(manifest.listings)) {
    check(LOCALE.test(locale), `Invalid listing locale: ${locale}`)
    object(listing, `${locale} listing`)
    for (const key of Object.keys(listing)) {
      check(["title", "shortDescription", "fullDescription"].includes(key), `Unknown ${locale} listing field: ${key}`)
    }
    text(listing.title, `${locale} title`, 30)
    text(listing.shortDescription, `${locale} shortDescription`, 80)
    text(listing.fullDescription, `${locale} fullDescription`, 4000)
    listings[locale] = { ...listing }
    const notes = (await readFile(resolve(directory, "whatsnew", `whatsnew-${locale}`), "utf8")).trim()
    text(notes, `${locale} release notes`, 500)
    releaseNotes.push({ language: locale, text: notes })
    const localeImages = manifest.images[locale] ?? {}
    object(localeImages, `${locale} images`)
    for (const type of Object.keys(localeImages)) check(IMAGE_TYPES.includes(type), `Unsupported image type: ${type}`)
    images[locale] = {}
    for (const type of IMAGE_TYPES) {
      const filenames = localeImages[type] ?? []
      check(Array.isArray(filenames), `${locale} ${type} must be an array`)
      check(manifest.imagePolicy !== "preserve-existing" || filenames.length === 0, "preserve-existing forbids local images; use replace to publish versioned artwork")
      check(new Set(filenames).size === filenames.length, `${locale} ${type} contains duplicate image paths`)
      check(filenames.length <= (type === "phoneScreenshots" ? 8 : 1), `${locale} ${type} has too many images`)
      if (manifest.imagePolicy === "replace" && filenames.length < (type === "phoneScreenshots" ? 2 : 1)) missingImages.push(`${locale}/${type}`)
      images[locale][type] = await Promise.all(filenames.map((filename) => loadImage(directory, filename, type)))
    }
  }
  for (const locale of Object.keys(manifest.images)) {
    check(Object.hasOwn(listings, locale), `Image locale ${locale} has no listing text`)
  }
  check(!requireImages || missingImages.length === 0, `${app} is missing required Play artwork: ${missingImages.join(", ")}. Add genuine assets or import the existing Console listing before publishing.`)
  return { app, directory, packageName: config.packageName, defaultLanguage: manifest.defaultLanguage, imagePolicy: manifest.imagePolicy, listings, images, missingImages, releaseNotes, manifest }
}

async function main(args) {
  const apps = []
  let requireImages = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--require-images") requireImages = true
    else if (args[i] === "--app") {
      check(args[i + 1], "--app requires ticketiv or access")
      apps.push(args[++i])
    } else throw new Error(`Unknown argument: ${args[i]}`)
  }
  for (const app of apps.length ? apps : Object.keys(APPS)) {
    const listing = await loadListing(app, { requireImages })
    console.log(`${app}: valid listing text and ${listing.releaseNotes.length} release-note locale(s)`)
    if (listing.imagePolicy === "preserve-existing") console.log(`${app}: existing Console artwork will be preserved and checked before publication`)
    if (listing.missingImages.length) console.log(`${app}: artwork still required: ${listing.missingImages.join(", ")}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}
