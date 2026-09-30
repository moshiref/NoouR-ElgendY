/**
 * Seed content for the Work section.
 *
 * These SAMPLE items demonstrate the full metadata shape (tags, year,
 * client, platform, rating, aspect). They carry no media files yet, so the
 * gallery renders them as designed "Preview coming soon" tiles.
 *
 * The Admin Dashboard will replace this file's role entirely: categories and
 * items come from the database, media from Storage uploads — no component
 * changes needed. Delete the SAMPLE items once real content exists.
 */

import type { WorkCategory, WorkItem } from './work';

/**
 * Unified Work accent — warm champagne / muted gold (the original AI Video
 * accent). Every visible category shares this single value so the Work
 * index reads as one premium editorial voice. Future categories reuse it
 * by default; only diverge deliberately with a distinct `accent`.
 */
export const WORK_ACCENT = '#C8B98A';

export const SEED_CATEGORIES: WorkCategory[] = [
  {
    id: 'cat-ai-video',
    slug: 'ai-video',
    title: 'AI Video',
    shortDescription: 'Realistic AI visuals for fashion, medical & modern brands',
    description:
      'Realistic AI-powered visual content created for fashion, medical, hospitality, products and modern brands.',
    coverMedia: null,
    accent: WORK_ACCENT,
    displayOrder: 1,
    isVisible: true,
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'cat-design',
    slug: 'design',
    title: 'Design',
    shortDescription: 'Creative visual design across different industries',
    description: 'Creative visual design across different industries, brands and campaigns.',
    coverMedia: null,
    accent: WORK_ACCENT,
    displayOrder: 2,
    isVisible: true,
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'cat-ugc',
    slug: 'ugc',
    title: 'UGC Creator',
    shortDescription: 'Authentic content that feels natural, personal and engaging',
    description:
      'Authentic, engaging content created to feel natural while communicating the product and brand story.',
    coverMedia: null,
    accent: WORK_ACCENT,
    displayOrder: 3,
    isVisible: true,
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'cat-reviews',
    slug: 'reviews',
    title: 'Reviews',
    shortDescription: 'Product stories, experiences and visual reviews',
    description:
      'Product reviews and experiences presented through authentic visual storytelling.',
    coverMedia: null,
    accent: WORK_ACCENT,
    displayOrder: 4,
    isVisible: true,
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
  },
];

export const SEED_ITEMS: WorkItem[] = [
  // ---- AI VIDEO (sample) ----
  {
    id: 'item-velvet-hour',
    categoryId: 'cat-ai-video',
    slug: 'velvet-hour',
    title: 'Velvet Hour',
    description: 'AI fashion film — evening wear in motion, graded for campaign cutdowns.',
    mediaType: 'video',
    mediaUrl: '',
    aspect: 'reel',
    tags: ['Fashion', 'Commercial'],
    year: '2026',
    displayOrder: 1,
    isPublished: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'item-medicare-trust',
    categoryId: 'cat-ai-video',
    slug: 'medicare-trust',
    title: 'MediCare Trust',
    description: 'Calm, credible AI explainer for a hospital patient-journey campaign.',
    mediaType: 'video',
    mediaUrl: '',
    aspect: 'landscape',
    tags: ['Medical', 'Hospitals'],
    year: '2025',
    client: 'MediCare Group',
    displayOrder: 2,
    isPublished: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  // ---- DESIGN (sample) ----
  {
    id: 'item-maison-noir',
    categoryId: 'cat-design',
    slug: 'maison-noir-identity',
    title: 'Maison Noir Identity',
    description: 'Full visual identity — logotype, palette and launch collateral.',
    mediaType: 'image',
    mediaUrl: '',
    aspect: 'portrait',
    tags: ['Branding', 'Creative Design'],
    year: '2025',
    client: 'Maison Noir',
    displayOrder: 1,
    isPublished: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'item-summer-drop',
    categoryId: 'cat-design',
    slug: 'summer-drop-campaign',
    title: 'Summer Drop Campaign',
    description: 'Social-first campaign system — posters, stories and rollout kit.',
    mediaType: 'image',
    mediaUrl: '',
    aspect: 'square',
    tags: ['Social Media', 'Campaigns', 'Posters'],
    year: '2026',
    displayOrder: 2,
    isPublished: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  // ---- UGC (sample) ----
  {
    id: 'item-glow-ritual',
    categoryId: 'cat-ugc',
    slug: 'glow-ritual',
    title: 'Glow Ritual',
    description: 'Morning skincare routine, shot native-vertical for Reels.',
    mediaType: 'video',
    mediaUrl: '',
    aspect: 'reel',
    tags: ['Skincare', 'Short-form Video'],
    year: '2026',
    client: 'Lumière Skin',
    platform: 'Instagram',
    displayOrder: 1,
    isPublished: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'item-morning-brew',
    categoryId: 'cat-ugc',
    slug: 'morning-brew',
    title: 'Morning Brew',
    description: 'Café-day-in-my-life cut, brewed for TikTok discovery.',
    mediaType: 'video',
    mediaUrl: '',
    aspect: 'reel',
    tags: ['Hospitality', 'Short-form Video'],
    year: '2025',
    client: 'Kaffa House',
    platform: 'TikTok',
    displayOrder: 2,
    isPublished: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  // ---- REVIEWS (sample) ----
  {
    id: 'item-silk-serum',
    categoryId: 'cat-reviews',
    slug: 'silk-serum-honest-review',
    title: 'Silk Serum — Honest Review',
    description: 'Fourteen-day wear test, filmed start to finish.',
    mediaType: 'video',
    mediaUrl: '',
    aspect: 'landscape',
    tags: ['Skincare', 'Products'],
    year: '2026',
    client: 'Silk Serum',
    rating: '4.8/5',
    displayOrder: 1,
    isPublished: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'item-clinic-experience',
    categoryId: 'cat-reviews',
    slug: 'clinic-experience',
    title: 'Clinic Experience',
    description: 'A patient walkthrough — booking, visit and results.',
    mediaType: 'image',
    mediaUrl: '',
    aspect: 'portrait',
    tags: ['Medical', 'Doctors'],
    year: '2025',
    rating: '5/5',
    displayOrder: 2,
    isPublished: true,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
  },
];
