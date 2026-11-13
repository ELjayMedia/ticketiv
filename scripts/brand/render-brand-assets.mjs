#!/usr/bin/env node
/**
 * Renders every app and web logo file from scripts/brand/mark.mjs, so the
 * Ticketiv app, the Ticketiv Organizer app and the web app show the same marks.
 *
 *   node scripts/brand/render-brand-assets.mjs
 *
 * Needs Playwright's Chromium (a dev dependency; `pnpm test:e2e:install`), or set
 * CHROMIUM_PATH to an existing Chromium binary.
 */
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium } from "@playwright/test"

import { markSvg } from "./mark.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..")
const ANDROID_DENSITIES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
// In-app header mark: 28pt at 1x, 2x and 3x.
const IN_APP = { "": 28, "@2x": 56, "@3x": 84 }

async function main() {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
  const page = await browser.newPage()
  const png = async (svg, size) => {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<body style="margin:0">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body>`)
    return page.screenshot({ type: "png", omitBackground: true })
  }
  const write = async (path, data) => {
    await mkdir(dirname(join(ROOT, path)), { recursive: true })
    await writeFile(join(ROOT, path), data)
    console.log(path)
  }

  // Web: vector marks for headers.
  for (const product of ["ticketiv", "organizer"]) {
    await write(`public/brand/${product}-mark.svg`, `${markSvg(product)}\n`)
  }

  // Per app: Android launcher icons, Play icon and web favicons. The attendee
  // site uses the Ticketiv set at the web root; organiser pages use /organizer.
  for (const [product, app, webDir] of [["ticketiv", "ticketiv", "public"], ["organizer", "access", "public/organizer"]]) {
    const svg = markSvg(product)
    for (const [density, size] of Object.entries(ANDROID_DENSITIES)) {
      const image = await png(svg, size)
      for (const name of ["ic_launcher", "ic_launcher_round"]) {
        await write(`apps/${app}/android/app/src/main/res/mipmap-${density}/${name}.png`, image)
      }
    }
    await write(`apps/${app}/store-assets/play-icon-512.png`, await png(svg, 512))

    const faviconSizes = []
    for (const size of [16, 32, 48]) faviconSizes.push(await png(svg, size)) // one page: render in turn
    await write(`${webDir}/favicon.ico`, ico(faviconSizes))
    await write(`${webDir}/icon-192.png`, await png(svg, 192))
    await write(`${webDir}/icon-512.png`, await png(svg, 512))
    await write(`${webDir}/apple-icon.png`, await png(svg, 180))
  }
  // Older references (push badge, legacy links) to 32px PNGs at the web root.
  for (const name of ["favicon.png", "icon-light-32x32.png", "icon-dark-32x32.png"]) {
    await write(`public/${name}`, await png(markSvg("ticketiv"), 32))
  }

  // In-app header marks for both React Native apps.
  for (const [app, product] of [["ticketiv", "ticketiv"], ["access", "organizer"]]) {
    for (const [suffix, size] of Object.entries(IN_APP)) {
      await write(`apps/${app}/src/assets/brand-mark${suffix}.png`, await png(markSvg(product), size))
    }
  }

  await browser.close()
}

/** A .ico holding PNG images (supported by every current browser). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach((image, i) => {
    const size = image.readUInt32BE(16) // PNG IHDR width
    const entry = 6 + 16 * i
    header.writeUInt8(size >= 256 ? 0 : size, entry)
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(image.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += image.length
  })
  return Buffer.concat([header, ...images])
}

await main()
