/**
 * Prepares the About portrait from /img_about.
 *
 * 1. The source is a JPG whose "transparent" background is a painted
 *    grey/white checkerboard. Bright, neutral (unsaturated) pixels connected
 *    to the border — or forming larger enclosed pockets — are keyed out,
 *    then the matte is eroded 1px and feathered to remove the JPEG halo.
 *    The coat (camel) and scarf (cream) are warm, so they survive the key.
 * 2. The coat colour is measured (median of coat-only regions) and a
 *    contrast-safe accent is derived from it, written to palette.json for
 *    the About specialties.
 *
 * Run with `npm run optimize:images`.
 */
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE_DIR = 'img_about';
const OUTPUT_DIR = 'src/assets/about';
const WIDTHS = [560, 747];

/** Background = near-white and near-neutral. */
const BG_MIN_LUMA = 200;
const BG_MAX_CHROMA = 14;
/** Enclosed background pockets smaller than this stay opaque (protects highlights). */
const MIN_POCKET = 150;
/**
 * …unless they are big enough to be a real gap AND spectrally checker-like:
 * small enclosed pockets (e.g. the arm–torso gap) are removed when their
 * average chroma is near-zero and luma is high. Warm glints (fabric sheen,
 * hardware, glasses — chroma ≈ 12+) are always preserved.
 */
const POCKET_MIN_GAP_SIZE = 20;
const POCKET_MAX_CHROMA = 8;
const POCKET_MIN_LUMA = 215;

/** Coat-only sample regions in source pixels: [x0, y0, x1, y1]. */
const COAT_REGIONS = [
  [440, 860, 600, 1000], // lower coat panel, right of the scarf
  [560, 380, 630, 470], // right sleeve
  [262, 560, 296, 640], // left sleeve
];

const files = await readdir(SOURCE_DIR);
const source = files.find((file) => /\.(png|webp|jpe?g|avif)$/i.test(file));
if (!source) {
  console.error(`No image found in ${SOURCE_DIR}/`);
  process.exit(1);
}
const input = path.join(SOURCE_DIR, source);

const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const N = W * H;

/* ---------- 1. Matte ---------- */

const candidate = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const r = data[i * 3];
  const g = data[i * 3 + 1];
  const b = data[i * 3 + 2];
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  candidate[i] = luma >= BG_MIN_LUMA && chroma <= BG_MAX_CHROMA ? 1 : 0;
}

const label = new Int32Array(N).fill(-1);
const queue = new Int32Array(N);
const background = new Uint8Array(N);

for (let start = 0; start < N; start++) {
  if (!candidate[start] || label[start] !== -1) continue;
  let head = 0;
  let tail = 0;
  let touchesBorder = false;
  queue[tail++] = start;
  label[start] = start;
  while (head < tail) {
    const i = queue[head++];
    const x = i % W;
    const y = (i - x) / W;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) touchesBorder = true;
    const neighbours = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
    for (const n of neighbours) {
      if (n >= 0 && candidate[n] && label[n] === -1) {
        label[n] = start;
        queue[tail++] = n;
      }
    }
  }
  if (touchesBorder || tail >= MIN_POCKET) {
    for (let k = 0; k < tail; k++) background[queue[k]] = 1;
  } else if (tail >= POCKET_MIN_GAP_SIZE) {
    // Small enclosed pocket: keep fabric glints, drop checker gaps.
    let lumaSum = 0;
    let chromaSum = 0;
    for (let k = 0; k < tail; k++) {
      const i = queue[k];
      const r = data[i * 3];
      const g = data[i * 3 + 1];
      const b = data[i * 3 + 2];
      lumaSum += 0.299 * r + 0.587 * g + 0.114 * b;
      chromaSum += Math.max(r, g, b) - Math.min(r, g, b);
    }
    if (lumaSum / tail >= POCKET_MIN_LUMA && chromaSum / tail <= POCKET_MAX_CHROMA) {
      for (let k = 0; k < tail; k++) background[queue[k]] = 1;
    }
  }
}

// Erode the subject by 1px so compressed light fringe pixels go with the background.
const alpha = Buffer.alloc(N);
for (let i = 0; i < N; i++) {
  if (background[i]) continue;
  const x = i % W;
  const y = (i - x) / W;
  const edge =
    (x > 0 && background[i - 1]) ||
    (x < W - 1 && background[i + 1]) ||
    (y > 0 && background[i - W]) ||
    (y < H - 1 && background[i + W]);
  alpha[i] = edge ? 0 : 255;
}

// sharp returns blurred single-channel input as sRGB — keep only one channel.
const feathered = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } })
  .blur(0.7)
  .extractChannel(0)
  .raw()
  .toBuffer();

const cutout = await sharp(data, { raw: { width: W, height: H, channels: 3 } })
  .joinChannel(feathered, { raw: { width: W, height: H, channels: 1 } })
  .png()
  .toBuffer();

await mkdir(OUTPUT_DIR, { recursive: true });
for (const width of WIDTHS) {
  const target = Math.min(width, W);
  const output = path.join(OUTPUT_DIR, `about-${target}.webp`);
  const out = await sharp(cutout)
    .resize({ width: target, withoutEnlargement: true })
    .webp({ quality: 88, alphaQuality: 100, effort: 6, smartSubsample: true })
    .toFile(output);
  console.log(`${output}  ${out.width}x${out.height}  ${(out.size / 1024).toFixed(0)} KB`);
}

/* ---------- 2. Coat colour → accent ---------- */

const samples = [[], [], []];
for (const [x0, y0, x1, y1] of COAT_REGIONS) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 3;
      for (let c = 0; c < 3; c++) samples[c].push(data[i + c]);
    }
  }
}
const median = (values) => values.sort((a, b) => a - b)[values.length >> 1];
const coat = samples.map(median);

const toHsl = ([r, g, b]) => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
  }
  return [(h * 60 + 360) % 360, s, l];
};
const toRgb = ([h, s, l]) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
};
const hex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const PAGE_BG = [8, 8, 8];
const contrast = (rgb) => (luminance(rgb) + 0.05) / (luminance(PAGE_BG) + 0.05);

// Same hue; slightly desaturated for the dark page; lightened only as far as needed for ≥ 5:1.
const [hue, sat, light] = toHsl(coat);
const accentSat = Math.min(sat, 0.42) * 0.92;
let accentLight = light;
while (contrast(toRgb([hue, accentSat, accentLight])) < 5 && accentLight < 0.8) accentLight += 0.01;
const accent = toRgb([hue, accentSat, accentLight]);
const accentLight2 = toRgb([hue, accentSat * 0.9, Math.min(accentLight + 0.12, 0.85)]);

const palette = {
  source: source,
  coatMedian: hex(coat),
  accent: hex(accent),
  accentHover: hex(accentLight2),
  accentRgb: accent.join(', '),
  contrastOnBackground: Number(contrast(accent).toFixed(2)),
};
await writeFile(
  path.join(OUTPUT_DIR, 'palette.ts'),
  `// Generated by scripts/optimize-about.mjs — measured from the coat in the About portrait.\n` +
    `// Do not edit by hand; re-run \`npm run optimize:about\`.\n` +
    `export const coatPalette = ${JSON.stringify(palette, null, 2)} as const;\n`,
);
console.log('palette', palette);
