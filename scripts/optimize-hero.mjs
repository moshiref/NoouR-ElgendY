/**
 * Converts the source hero cut-out in /img_hero into alpha-preserving WebP
 * renditions under src/assets/hero. Run with `npm run optimize:images`
 * whenever the source image changes; the outputs are committed so the
 * regular build never depends on sharp.
 */
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = 'img_hero';
const OUTPUT_DIR = 'src/assets/hero';
const WIDTHS = [560, 941];

const files = await readdir(SOURCE_DIR);
const source = files.find((file) => /\.(png|webp|jpe?g|avif)$/i.test(file));

if (!source) {
  console.error(`No image found in ${SOURCE_DIR}/`);
  process.exit(1);
}

await mkdir(OUTPUT_DIR, { recursive: true });

const input = path.join(SOURCE_DIR, source);
const { width: sourceWidth, height: sourceHeight } = await sharp(input).metadata();

/*
 * The source is cropped at the feet. Bake a soft fade into the alpha channel
 * so the edge dissolves into the page — doing this with a CSS mask instead
 * forces a separate compositing surface that shows as a faint rectangle.
 */
const fadeMask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${sourceWidth}" height="${sourceHeight}">
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.68" stop-color="#fff" stop-opacity="1"/>
      <stop offset="0.86" stop-color="#fff" stop-opacity="0.35"/>
      <stop offset="0.985" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <rect width="100%" height="100%" fill="url(#fade)"/>
  </svg>`,
);
const faded = await sharp(input)
  .ensureAlpha()
  .composite([{ input: fadeMask, blend: 'dest-in' }])
  .png()
  .toBuffer();

for (const width of WIDTHS) {
  const target = Math.min(width, sourceWidth);
  const output = path.join(OUTPUT_DIR, `hero-${target}.webp`);
  const info = await sharp(faded)
    .resize({ width: target, withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 92, effort: 6, smartSubsample: true })
    .toFile(output);
  console.log(`${output}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
}
