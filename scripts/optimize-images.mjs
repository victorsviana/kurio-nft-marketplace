// Generates responsive WebP variants of the Figma artworks (1254px PNGs, ~2MB each).
// Source: design/inicio/assets/nft-*.png (exported from Figma). Output: public/images/nft/.
// Run: npm run images
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'design/inicio/assets'
const OUT = 'public/images/nft'
const WIDTHS = [256, 512, 960]

await mkdir(OUT, { recursive: true })
const files = (await readdir(SRC)).filter((f) => /^nft-.*\.png$/.test(f))

for (const file of files) {
  const name = file.replace(/^nft-/, '').replace(/\.png$/, '')
  for (const width of WIDTHS) {
    const target = path.join(OUT, `${name}-${width}.webp`)
    const info = await sharp(path.join(SRC, file)).resize(width).webp({ quality: 78, effort: 6 }).toFile(target)
    console.log(`${target} ${(info.size / 1024).toFixed(1)}KB`)
  }
}
