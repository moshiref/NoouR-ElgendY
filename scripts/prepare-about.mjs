/**
 * Prepares the About portrait from /img_about.
 *
 * The source is a cut-out photographed against a baked-in transparency
 * checkerboard (it is a JPEG, so there is no real alpha channel). This
 * script keys the checker out with an edge-seeded flood fill, feathers the
 * silhouette, samples the coat color for the specialties accent, and writes
 * alpha-preserving WebP renditions under src/assets/about.
 *
 * Run once with `node scripts/prepare-about.mjs` whenever the source
 * changes; the outputs are committed so the regular build never depends
 * on sharp.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = 'img_about';
const OUTPUT_DIR = 'src/assets/about';
const WIDTHS = [520, 747];

const files = await readdir(SOURCE_DIR);
const source = files.find((file) => /\.(png|webp|jpe?g|avif)$/i.test(file));

if (!source) {
  console.error(`No image found in ${SOURCE_DIR}/`);
  process.exit(1);
}

const input = path.join(SOURCE_DIR, source);
const { width: W, height: H } = await sharp(input).metadata();
const { data } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });

const at = (x, y) => (y * W + x) * 3;

/** True for the neutral, light squares of the baked-in checkerboard. */
function isChecker(x, y) {
  const i = at(x, y);
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const mn = Math.min(r, g, b);
  const mx = Math.max(r, g, b);
  return mn > 130 && mx - mn < 18;
}

/* Flood fill the background from every border pixel. */
const background = new Uint8Array(W * H);
const stack = [];
for (let x = 0; x < W; x++) {
  stack.push([x, 0], [x, H - 1]);
}
for (let y = 0; y < H; y++) {
  stack.push([0, y], [W - 1, y]);
}
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < 0 || y < 0 || x >= W || y >= H) continue;
  const idx = y * W + x;
  if (background[idx] || !isChecker(x, y)) continue;
  background[idx] = 1;
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}

/* Keep-mask: 255 where the subject is. Erode 1px to cut the JPEG halo fringe. */
const keep = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) keep[i] = background[i] ? 0 : 255;
const eroded = Uint8Array.from(keep);
for (let y = 1; y < H - 1; y++) {
  for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (!keep[i]) continue;
    if (!keep[i - 1] || !keep[i + 1] || !keep[i - W] || !keep[i + W]) eroded[i] = 0;
  }
}

/* Diagnostics: opaque bounding box should hug the subject, never the frame. */
let minX = W;
let minY = H;
let maxX = 0;
let maxY = 0;
let kept = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!eroded[y * W + x]) continue;
    kept++;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}
console.log(`opaque bbox: x ${minX}-${maxX} / y ${minY}-${maxY}  (${((kept / (W * H)) * 100).toFixed(1)}% kept)`);
// The garment is cropped at the frame's bottom edge, so touching y-max is
// expected. A leak would show background reaching the left, top or right edge.
if (minX < 3 || minY < 3 || maxX > W - 4) {
  console.error('Background fill leaked to the frame edge — refusing to write output.');
  process.exit(1);
}

/* Feather the silhouette: blur the keep-mask, pack it into an alpha
   channel (dest-in reads the overlay's alpha, not its luminance),
   then punch it into the image. */
const { data: blurred } = await sharp(Buffer.from(eroded), {
  raw: { width: W, height: H, channels: 1 },
})
  .blur(0.8)
  .raw()
  .toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  rgba[i * 4] = 255;
  rgba[i * 4 + 1] = 255;
  rgba[i * 4 + 2] = 255;
  rgba[i * 4 + 3] = blurred[i];
}
const maskPng = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
  .png()
  .toBuffer();
const cutout = await sharp(input)
  .ensureAlpha()
  .composite([{ input: maskPng, blend: 'dest-in' }])
  .png()
  .toBuffer();

/* Sample the coat: saturated mid-tones in the lower-centre garment zone. */
const samples = [];
for (let y = Math.floor(H * 0.55); y < Math.floor(H * 0.92); y += 2) {
  for (let x = Math.floor(W * 0.4); x < Math.floor(W * 0.64); x += 2) {
    const i = y * W + x;
    if (!eroded[i]) continue;
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    if (mx - mn > 45 && mx < 235 && mn > 60) samples.push([r, g, b]);
  }
}
const median = (arr) => arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];
const coat = [0, 1, 2].map((c) => median(samples.map((s) => s[c])));
const hex = `#${coat.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
console.log(`coat sample: rgb(${coat.join(', ')})  ${hex}  (${samples.length} px)`);

await mkdir(OUTPUT_DIR, { recursive: true });
for (const width of WIDTHS) {
  const target = Math.min(width, W);
  const output = path.join(OUTPUT_DIR, `about-${target}.webp`);
  const info = await sharp(cutout)
    .resize({ width: target, withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 92, effort: 6, smartSubsample: true })
    .toFile(output);
  console.log(`${output}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
}

await writeFile(
  path.join(OUTPUT_DIR, 'coat-color.txt'),
  `Derived from the coat in ${source}: ${hex}\n`,
);
console.log('Done.');
