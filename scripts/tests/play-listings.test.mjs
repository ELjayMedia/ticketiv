import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { deflateSync } from "node:zlib"

import { APPS, imageDimensions, inspectImage, loadListing } from "../validate-play-listings.mjs"

// Valid, tiny compressed fixture files; no product artwork is generated here.
function png(width, height) {
  function chunk(type, data) {
    const payload = Buffer.concat([Buffer.from(type), data])
    let crc = 0xffffffff
    for (const byte of payload) {
      crc ^= byte
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
    }
    const frame = Buffer.alloc(12 + data.length)
    frame.writeUInt32BE(data.length)
    payload.copy(frame, 4)
    frame.writeUInt32BE((crc ^ 0xffffffff) >>> 0, frame.length - 4)
    return frame
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.alloc((width * 3 + 1) * height))),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

async function fixture(t, mutate = () => {}) {
  const root = await mkdtemp(join(tmpdir(), "play-listing-test-"))
  t.after(() => rm(root, { recursive: true, force: true }))
  const directory = join(root, APPS.ticketiv.directory)
  await mkdir(join(directory, "whatsnew"), { recursive: true })
  await writeFile(join(directory, "whatsnew/whatsnew-en-US"), "Ticket scanning improvements.\n")
  const manifest = {
    packageName: "com.ticketiv.app",
    defaultLanguage: "en-US",
    imagePolicy: "preserve-existing",
    listings: { "en-US": { title: "Ticketiv", shortDescription: "Event tickets together.", fullDescription: "Browse events and keep delivered tickets on your device." } },
    images: {},
  }
  await mutate(manifest, directory, root)
  await writeFile(join(directory, "listing.json"), JSON.stringify(manifest))
  return { root, directory, manifest }
}

test("committed listings validate with explicit preservation of approved Console images", async () => {
  for (const app of Object.keys(APPS)) {
    const listing = await loadListing(app, { requireImages: true })
    assert.equal(listing.packageName, APPS[app].packageName)
    assert.equal(listing.imagePolicy, "preserve-existing")
    assert.deepEqual(listing.missingImages, [])
    assert.ok(listing.releaseNotes[0].text.length > 0)
  }
})

test("preservation with any local artwork requires a complete snapshot before publishing", async (t) => {
  const { root } = await fixture(t, async (manifest, dir) => {
    manifest.images = { "en-US": { icon: ["icon.png"] } }
    await writeFile(join(dir, "icon.png"), png(512, 512))
  })
  assert.deepEqual((await loadListing("ticketiv", { root })).missingImages, ["en-US/featureGraphic", "en-US/phoneScreenshots"])
  await assert.rejects(loadListing("ticketiv", { root, requireImages: true }), /missing required Play artwork/)
})

test("preserved snapshots allow already accepted tall screenshots and remain hashable", async (t) => {
  const { root, directory } = await fixture(t, async (manifest, dir) => {
    manifest.images = { "en-US": { icon: ["icon.png"], featureGraphic: ["feature.png"], phoneScreenshots: ["screen1.png", "screen2.png"] } }
    await Promise.all([
      writeFile(join(dir, "icon.png"), png(512, 512)),
      writeFile(join(dir, "feature.png"), png(1024, 500)),
      writeFile(join(dir, "screen1.png"), png(1080, 2400)),
      writeFile(join(dir, "screen2.png"), png(1080, 2400)),
    ])
  })
  const snapshot = await loadListing("ticketiv", { root, requireImages: true })
  assert.equal(snapshot.images["en-US"].phoneScreenshots[0].height, 2400)
  assert.match(snapshot.images["en-US"].phoneScreenshots[0].sha256, /^[a-f0-9]{64}$/)
  const manifest = JSON.parse(await readFile(join(directory, "listing.json"), "utf8"))
  manifest.imagePolicy = "replace"
  await writeFile(join(directory, "listing.json"), JSON.stringify(manifest))
  await assert.rejects(loadListing("ticketiv", { root, requireImages: true }), /aspect ratio/)
})

test("preserved snapshot completeness applies across all declared locales", async (t) => {
  const { root } = await fixture(t, async (manifest, dir) => {
    manifest.listings["pt-PT"] = { ...manifest.listings["en-US"] }
    await writeFile(join(dir, "whatsnew/whatsnew-pt-PT"), "Melhorias.\n")
    manifest.images = { "en-US": { icon: ["icon.png"], featureGraphic: ["feature.png"], phoneScreenshots: ["screen1.png", "screen2.png"] } }
    await Promise.all([
      writeFile(join(dir, "icon.png"), png(512, 512)),
      writeFile(join(dir, "feature.png"), png(1024, 500)),
      writeFile(join(dir, "screen1.png"), png(1080, 2400)),
      writeFile(join(dir, "screen2.png"), png(1080, 2400)),
    ])
  })
  await assert.rejects(loadListing("ticketiv", { root, requireImages: true }), /pt-PT\/icon.*pt-PT\/featureGraphic.*pt-PT\/phoneScreenshots/)
})

test("replacement requires real complete local image sets before publishing", async (t) => {
  const { root } = await fixture(t, (manifest) => { manifest.imagePolicy = "replace" })
  const listing = await loadListing("ticketiv", { root })
  assert.deepEqual(listing.missingImages, ["en-US/icon", "en-US/featureGraphic", "en-US/phoneScreenshots"])
  await assert.rejects(loadListing("ticketiv", { root, requireImages: true }), /missing required Play artwork/)
})

test("complete replacements preserve file order and expose checked image hashes", async (t) => {
  const { root, directory } = await fixture(t, async (manifest, dir) => {
    manifest.imagePolicy = "replace"
    manifest.images = { "en-US": { icon: ["icon.png"], featureGraphic: ["feature.png"], phoneScreenshots: ["screen2.png", "screen1.png"] } }
    await Promise.all([
      writeFile(join(dir, "icon.png"), png(512, 512)),
      writeFile(join(dir, "feature.png"), png(1024, 500)),
      writeFile(join(dir, "screen1.png"), png(720, 1280)),
      writeFile(join(dir, "screen2.png"), png(720, 1280)),
    ])
  })
  const listing = await loadListing("ticketiv", { root, requireImages: true })
  assert.equal(listing.images["en-US"].phoneScreenshots[0].path, join(directory, "screen2.png"))
  assert.equal(listing.images["en-US"].icon[0].width, 512)
  assert.match(listing.images["en-US"].icon[0].sha256, /^[a-f0-9]{64}$/)
})

test("manifest binds app identity and explicitly names image policy", async (t) => {
  for (const [mutation, message] of [
    [(manifest) => { manifest.packageName = "com.other.app" }, /packageName must be/],
    [(manifest) => { delete manifest.imagePolicy }, /imagePolicy must explicitly/],
    [(manifest) => { manifest.defaultLanguage = "pt-PT" }, /defaultLanguage must have listing text/],
    [(manifest) => { manifest.unknown = true }, /Unknown listing manifest field/],
  ]) {
    const { root } = await fixture(t, mutation)
    await assert.rejects(loadListing("ticketiv", { root }), message)
  }
  await assert.rejects(loadListing("other"), /Unsupported Play app/)
})

test("text limits apply to Unicode code points and reject placeholders", async (t) => {
  const { root } = await fixture(t, (manifest) => { manifest.listings["en-US"].title = "🎟".repeat(30) })
  assert.equal((await loadListing("ticketiv", { root })).listings["en-US"].title.length, 60)
  for (const [field, value, message] of [
    ["title", "x".repeat(31), /exceeds 30/],
    ["shortDescription", "x".repeat(81), /exceeds 80/],
    ["fullDescription", "x".repeat(4001), /exceeds 4000/],
    ["title", "TBD", /placeholder/],
    ["title", " Ticketiv", /whitespace/],
    ["title", "Ticket\u0001iv", /control/],
  ]) {
    const { root: badRoot } = await fixture(t, (manifest) => { manifest.listings["en-US"][field] = value })
    await assert.rejects(loadListing("ticketiv", { root: badRoot }), message)
  }
})

test("release notes must exist for each locale and fit Play's 500-character limit", async (t) => {
  const { root, directory } = await fixture(t)
  await writeFile(join(directory, "whatsnew/whatsnew-en-US"), "x".repeat(501))
  await assert.rejects(loadListing("ticketiv", { root }), /release notes exceeds 500/)
  await rm(join(directory, "whatsnew/whatsnew-en-US"))
  await assert.rejects(loadListing("ticketiv", { root }), /ENOENT/)
})

test("locale paths, unknown image types and duplicate paths fail validation", async (t) => {
  for (const [mutation, message] of [
    [(manifest) => { manifest.listings["../../secret"] = manifest.listings["en-US"] }, /Invalid listing locale/],
    [(manifest) => { manifest.images["pt-PT"] = {} }, /has no listing text/],
    [(manifest) => { manifest.images["en-US"] = { banner: [] } }, /Unsupported image type/],
    [(manifest) => { manifest.imagePolicy = "replace"; manifest.images["en-US"] = { icon: ["icon.png", "icon.png"] } }, /duplicate image paths/],
  ]) {
    const { root } = await fixture(t, mutation)
    await assert.rejects(loadListing("ticketiv", { root }), message)
  }
})

test("local paths and symlinks cannot escape the listing directory", async (t) => {
  for (const filename of ["../icon.png", "/tmp/icon.png", "images\\icon.png"]) {
    const { root } = await fixture(t, (manifest) => {
      manifest.imagePolicy = "replace"
      manifest.images = { "en-US": { icon: [filename] } }
    })
    await assert.rejects(loadListing("ticketiv", { root }), /must stay inside|must use a relative/)
  }
  const { root } = await fixture(t, async (manifest, dir, fixtureRoot) => {
    await writeFile(join(fixtureRoot, "outside.png"), png(512, 512))
    await symlink(join(fixtureRoot, "outside.png"), join(dir, "icon.png"))
    manifest.imagePolicy = "replace"
    manifest.images = { "en-US": { icon: ["icon.png"] } }
  })
  await assert.rejects(loadListing("ticketiv", { root }), /symlink must stay inside/)
})

test("image checks reject wrong formats, sizes and aspect ratios", () => {
  assert.throws(() => inspectImage(Buffer.from("not a png"), "icon"), /PNG or JPEG/)
  assert.throws(() => inspectImage(png(256, 256), "icon"), /512 x 512 PNG/)
  assert.throws(() => inspectImage(png(1024, 501), "featureGraphic"), /1024 x 500/)
  assert.throws(() => inspectImage(png(300, 600), "phoneScreenshots"), /between 320 and 3840/)
  assert.throws(() => inspectImage(png(400, 1200), "phoneScreenshots"), /2:1/)
  assert.throws(() => inspectImage(Buffer.alloc(1024 * 1024 + 1), "icon"), /exceeds/)
  assert.throws(() => inspectImage(png(512, 512), "banner"), /Unsupported image type/)
  assert.equal(inspectImage(png(1080, 2400), "phoneScreenshots", "existing", { existing: true }).height, 2400)
  assert.throws(() => inspectImage(Buffer.from("invalid"), "phoneScreenshots", "existing", { existing: true }), /PNG or JPEG/)
  assert.throws(() => inspectImage(png(256, 256), "icon", "existing", { existing: true }), /512 x 512/)
  assert.throws(() => inspectImage(png(1024, 501), "featureGraphic", "existing", { existing: true }), /1024 x 500/)
  assert.throws(() => inspectImage(png(300, 600), "phoneScreenshots", "existing", { existing: true }), /between 320 and 3840/)
  assert.throws(() => inspectImage(Buffer.alloc(8 * 1024 * 1024 + 1), "phoneScreenshots", "existing", { existing: true }), /exceeds/)
})

test("PNG and JPEG dimensions are read with bounds checks", async () => {
  const actualIcon = await readFile(new URL("../../apps/ticketiv/store-assets/play-icon-512.png", import.meta.url))
  assert.deepEqual(imageDimensions(actualIcon), { width: 512, height: 512, mimeType: "image/png" })
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x08, 0x08, 0x02, 0x80, 0x01, 0xe0, 0x00, 0xff, 0xd9])
  assert.deepEqual(imageDimensions(jpeg), { width: 480, height: 640, mimeType: "image/jpeg" })
  assert.throws(() => imageDimensions(jpeg.subarray(0, 8)), /Truncated JPEG/)
})
