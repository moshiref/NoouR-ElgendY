/**
 * Work content model — the contract between the portfolio frontend and the
 * future Admin Dashboard.
 *
 * Field names mirror the intended database columns 1:1 (`categories` and
 * `work_items` tables), so a Supabase-backed repository can reuse these
 * types unchanged. See `lib/workRepository.ts` for the swap-in point.
 */

export type MediaType = 'image' | 'video';

/** Declared aspect — the gallery honours it instead of force-cropping. */
export type MediaAspect = 'reel' | 'portrait' | 'square' | 'landscape' | 'wide';

export interface CoverMedia {
  type: MediaType;
  /** Bundled import today, Supabase Storage public URL tomorrow. */
  src: string;
  alt: string;
  poster?: string;
}

export interface WorkCategory {
  id: string;
  slug: string;
  title: string;
  /** One/two-line teaser shown on the Work index rows. */
  shortDescription: string;
  /** Full intro shown on the dedicated category page. */
  description: string;
  /** Null until the admin uploads a cover — UI degrades to typography. */
  coverMedia: CoverMedia | null;
  /** Refined editorial accent (hex, e.g. "#C8B98A") used for the Work index
      title and its divider. Null = fall back to the default treatment. */
  accent: string | null;
  displayOrder: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItem {
  id: string;
  categoryId: string;
  slug: string;
  title: string;
  description?: string;
  mediaType: MediaType;
  /** Empty string = not uploaded yet → UI renders a "coming soon" tile. */
  mediaUrl: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  aspect: MediaAspect;
  tags: string[];
  year?: string;
  client?: string;
  /** e.g. Instagram / TikTok for UGC. */
  platform?: string;
  /** e.g. "4.8/5" for reviews. Free text, never computed. */
  rating?: string;
  externalUrl?: string;
  /** Ambient muted autoplay where tasteful (desktop only, never on mobile). */
  autoplay?: boolean;
  displayOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
