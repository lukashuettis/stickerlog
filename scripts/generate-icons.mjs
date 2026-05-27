// Generate PWA icons (192/512/maskable + apple-touch + og:image) from the
// canonical SVG logo. Run with `node scripts/generate-icons.mjs` whenever the
// logo changes.
//
// We render two flavours:
//   - "any" purpose: transparent background, logo edge-to-edge → favicons,
//     manifest "any", apple-touch
//   - "maskable" purpose: brand-colour background with safe-zone padding so
//     Android/Chrome can crop a circle or squircle without clipping
//
// The OpenGraph image is a 1200×630 card with the logo centred and a
// background tinted to the brand colour, suitable for Twitter/WhatsApp/etc.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const publicDir = resolve(root, 'public')
const svgPath = resolve(publicDir, 'favicon.svg')

const PRIMARY_BG = '#dcfce7' // primary-soft, gentle green tint

await mkdir(publicDir, { recursive: true })

const svgBuf = await readFile(svgPath)

// 1. Transparent "any" icons
for (const size of [192, 512]) {
  await sharp(svgBuf, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(publicDir, `icon-${size}.png`))
  console.log(`✓ icon-${size}.png`)
}

// 2. Maskable icon — fill background, add safe-zone padding
{
  const size = 512
  const safeZone = Math.round(size * 0.7) // logo fills 70% of canvas
  const logoBuf = await sharp(svgBuf, { density: 384 })
    .resize(safeZone, safeZone, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  const offset = Math.round((size - safeZone) / 2)
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: PRIMARY_BG,
    },
  })
    .composite([{ input: logoBuf, top: offset, left: offset }])
    .png()
    .toFile(resolve(publicDir, 'icon-maskable-512.png'))
  console.log('✓ icon-maskable-512.png')
}

// 3. Apple touch icon — Apple ignores the maskable flag, wants a square with
// background colour pre-baked (no transparency or it gets a black background).
{
  const size = 180
  const logoBuf = await sharp(svgBuf, { density: 256 })
    .resize(Math.round(size * 0.78), Math.round(size * 0.78), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
  const offset = Math.round((size - Math.round(size * 0.78)) / 2)
  await sharp({
    create: { width: size, height: size, channels: 4, background: '#ffffff' },
  })
    .composite([{ input: logoBuf, top: offset, left: offset }])
    .png()
    .toFile(resolve(publicDir, 'apple-touch-icon.png'))
  console.log('✓ apple-touch-icon.png')
}

// 4. OpenGraph card — 1200x630, logo centred-left, brand background.
{
  const w = 1200
  const h = 630
  const logoSize = 360
  const logoBuf = await sharp(svgBuf, { density: 512 })
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()
  await sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: PRIMARY_BG,
    },
  })
    .composite([{ input: logoBuf, top: Math.round((h - logoSize) / 2), left: 120 }])
    .png()
    .toFile(resolve(publicDir, 'og-image.png'))
  console.log('✓ og-image.png')
}

console.log('Done.')
