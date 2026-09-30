import type { MediaAspect, WorkCategory, WorkItem } from '../data/work';
import { WORK_ACCENT } from '../data/workSeed';
import { getSupabase } from './supabase';
import type { WorkRepository } from './workRepository';

/**
 * Supabase-backed Work content: the production implementation of the
 * WorkRepository contract + the Admin Dashboard service layer.
 *
 * Tables/storage come from supabase/work_admin.sql. Media lives ONLY in the
 * `work-media` Storage bucket (paths like `ai-video/<uuid>.mp4`); rows store
 * paths, and the public site resolves fast CDN-ready public URLs from them.
 * No binaries in Postgres, no signed-URL round trips on public pages.
 */

export const WORK_BUCKET = 'work-media';

const ASPECTS: readonly MediaAspect[] = ['reel', 'portrait', 'square', 'landscape', 'wide'];

interface DbCategory {
  id: string;
  slug: string;
  title: string;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

interface DbItem {
  id: string;
  category_id: string;
  title: string | null;
  description: string | null;
  media_type: string | null;
  media_path: string | null;
  thumbnail_path: string | null;
  aspect: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

function parseAspect(value: string | null): MediaAspect {
  return (ASPECTS as readonly string[]).includes(value ?? '')
    ? (value as MediaAspect)
    : 'landscape';
}

/** Public CDN URL for a storage path — pure string building, no network. */
export function publicMediaUrl(path: string): string {
  return getSupabase().storage.from(WORK_BUCKET).getPublicUrl(path).data.publicUrl;
}

function mapCategory(row: DbCategory): WorkCategory {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: '',
    description: '',
    coverMedia: null,
    accent: WORK_ACCENT,
    displayOrder: row.display_order,
    isVisible: row.is_visible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItem(row: DbItem): WorkItem {
  const mediaPath = row.media_path ?? '';
  const thumbPath = row.thumbnail_path ?? '';
  return {
    id: row.id,
    categoryId: row.category_id,
    slug: row.id,
    title: row.title ?? '',
    description: row.description ?? undefined,
    mediaType: row.media_type === 'video' ? 'video' : 'image',
    mediaUrl: mediaPath ? publicMediaUrl(mediaPath) : '',
    posterUrl: thumbPath ? publicMediaUrl(thumbPath) : undefined,
    thumbnailUrl: thumbPath ? publicMediaUrl(thumbPath) : undefined,
    aspect: parseAspect(row.aspect),
    tags: [],
    displayOrder: row.display_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const orderBy = 'display_order.asc,created_at.asc';

/** Public read path — honours RLS (visible categories, published items). */
export class SupabaseWorkRepository implements WorkRepository {
  async listVisibleCategories(): Promise<WorkCategory[]> {
    const { data, error } = await getSupabase()
      .from('work_categories')
      .select('*')
      .eq('is_visible', true)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return (data as DbCategory[]).map(mapCategory);
  }

  async getCategoryBySlug(slug: string): Promise<WorkCategory | null> {
    const needle = slug.trim().toLowerCase();
    const { data, error } = await getSupabase()
      .from('work_categories')
      .select('*')
      .eq('is_visible', true)
      .ilike('slug', needle)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCategory(data as DbCategory) : null;
  }

  async listPublishedItems(categoryId: string): Promise<WorkItem[]> {
    const { data, error } = await getSupabase()
      .from('work_items')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_published', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as DbItem[]).map(mapItem);
  }
}

export const supabaseWorkRepository: WorkRepository = new SupabaseWorkRepository();

/* ------------------------- Admin service (auth-gated) ------------------------- */

function errMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unexpected error. Please try again.';
}

/** Throws when nobody is signed in — RLS would reject the write anyway. */
export async function requireAdmin(): Promise<void> {
  const {
    data: { session },
    error,
  } = await getSupabase().auth.getSession();
  if (error) throw error;
  if (!session) throw new Error('Please sign in with your admin account first.');
}

export interface AdminItem extends WorkItem {
  mediaPath: string;
  thumbnailPath: string;
}

function mapAdminItem(row: DbItem): AdminItem {
  return { ...mapItem(row), mediaPath: row.media_path ?? '', thumbnailPath: row.thumbnail_path ?? '' };
}

/** All items in a category (published + hidden), in display order. */
export async function listAllItems(categoryId: string): Promise<AdminItem[]> {
  await requireAdmin();
  const { data, error } = await getSupabase()
    .from('work_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new Error(errMessage(error));
  return (data as DbItem[]).map(mapAdminItem);
}

export interface NewItemInput {
  categoryId: string;
  title: string;
  description: string;
  mediaType: 'image' | 'video';
  mediaPath: string;
  thumbnailPath: string;
  aspect: MediaAspect;
}

export async function createItem(input: NewItemInput): Promise<AdminItem> {
  await requireAdmin();
  const client = getSupabase();
  const { data: tail } = await client
    .from('work_items')
    .select('display_order')
    .eq('category_id', input.categoryId)
    .order('display_order', { ascending: false })
    .limit(1);
  const rows = (tail ?? []) as Array<{ display_order: number }>;
  const { data, error } = await client
    .from('work_items')
    .insert({
      category_id: input.categoryId,
      title: input.title,
      description: input.description,
      media_type: input.mediaType,
      media_path: input.mediaPath,
      thumbnail_path: input.thumbnailPath,
      aspect: input.aspect,
      display_order: (rows[0]?.display_order ?? -1) + 1,
      is_published: true,
    })
    .select('*')
    .single();
  if (error) throw new Error(errMessage(error));
  return mapAdminItem(data as DbItem);
}

export async function updateItem(
  id: string,
  patch: Partial<Pick<DbItem, 'title' | 'description' | 'media_type' | 'media_path' | 'thumbnail_path' | 'aspect' | 'is_published' | 'display_order'>>,
): Promise<void> {
  await requireAdmin();
  const { error } = await getSupabase().from('work_items').update(patch).eq('id', id);
  if (error) throw new Error(errMessage(error));
}

/** Deletes the row and its storage objects (best-effort — no orphans). */
export async function deleteItem(item: AdminItem): Promise<void> {
  await requireAdmin();
  const client = getSupabase();
  const paths = [item.mediaPath, item.thumbnailPath].filter(Boolean);
  if (paths.length > 0) {
    await client.storage.from(WORK_BUCKET).remove(paths);
  }
  const { error } = await client.from('work_items').delete().eq('id', item.id);
  if (error) throw new Error(errMessage(error));
}

/** Best-effort removal of replaced storage objects after a successful row update. */
export async function removePaths(paths: string[]): Promise<void> {
  const list = paths.filter(Boolean);
  if (list.length === 0) return;
  await getSupabase().storage.from(WORK_BUCKET).remove(list);
}

/** Swaps display_order of two items (Move Up / Move Down). */
export async function swapOrder(a: AdminItem, b: AdminItem): Promise<void> {
  await requireAdmin();
  const client = getSupabase();
  const first = await client
    .from('work_items')
    .update({ display_order: b.displayOrder })
    .eq('id', a.id);
  if (first.error) throw new Error(errMessage(first.error));
  const second = await client
    .from('work_items')
    .update({ display_order: a.displayOrder })
    .eq('id', b.id);
  if (second.error) {
    await client.from('work_items').update({ display_order: a.displayOrder }).eq('id', a.id);
    throw new Error(errMessage(second.error));
  }
}

/* ------------------------------- Uploads ------------------------------- */

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
const VIDEO_EXTS = ['mp4', 'webm', 'mov'];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export type UploadKind = 'image' | 'video' | 'poster';

export function classifyFile(file: File): UploadKind | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (IMAGE_EXTS.includes(ext) || file.type.startsWith('image/')) return 'image';
  if (VIDEO_EXTS.includes(ext) || file.type.startsWith('video/')) return 'video';
  return null;
}

export function checkFileSize(file: File, kind: UploadKind): string | null {
  const limit = kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    return `${file.name} exceeds the ${mb} MB limit.`;
  }
  return null;
}

function storageExt(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (file.type === 'video/mp4') return 'mp4';
  if (file.type === 'video/webm') return 'webm';
  if (file.type === 'video/quicktime') return 'mov';
  if (file.type === 'image/jpeg') return 'jpg';
  if (file.type === 'image/png') return 'png';
  return 'webp';
}

/** Uploads a device file to work-media/<slug>/<uuid>.<ext>. Returns the storage path. */
export async function uploadMediaFile(categorySlug: string, file: File): Promise<string> {
  const { path } = await uploadMediaFileProgress(categorySlug, file);
  return path;
}

export interface TrackedUpload {
  path: string;
  cancel: () => void;
  done: Promise<void>;
}

/**
 * Fast upload with REAL progress + cancellation.
 *
 * supabase-js `storage.upload()` is a single opaque PUT with no progress
 * callbacks, so large videos sit on a frozen bar. Instead we mint a short-
 * lived signed upload URL (same bucket, same client, same RLS — the signed
 * token inherits the admin session) and PUT the raw File with XHR, which
 * reports byte-level `upload.onprogress` and supports abort. The File is
 * streamed straight off disk: never base64-encoded, never duplicated in
 * memory, uploaded exactly once, with zero client-side processing.
 */
export function uploadMediaFileProgress(
  categorySlug: string,
  file: File,
  onProgress?: (fraction: number) => void,
): TrackedUpload {
  const client = getSupabase();
  const path = `${categorySlug}/${crypto.randomUUID()}.${storageExt(file)}`;
  const controller = new AbortController();

  const done = (async (): Promise<void> => {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw new Error(errMessage(sessionError));
    if (!sessionData.session) throw new Error('Please sign in with your admin account first.');

    const { data, error } = await client.storage
      .from(WORK_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data?.signedUrl) throw new Error(errMessage(error ?? 'Could not start upload.'));

    await new Promise<void>((resolve, reject) => {
      if (controller.signal.aborted) {
        reject(new DOMException('Upload cancelled.', 'AbortError'));
        return;
      }
      const xhr = new XMLHttpRequest();
      const onAbort = (): void => xhr.abort();
      const cleanup = (): void => controller.signal.removeEventListener('abort', onAbort);
      controller.signal.addEventListener('abort', onAbort, { once: true });
      xhr.upload.onprogress = (event): void => {
        if (event.lengthComputable && event.total > 0) {
          onProgress?.(Math.min(1, event.loaded / event.total));
        }
      };
      xhr.onload = (): void => {
        cleanup();
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed (HTTP ${xhr.status}). Please try again.`));
      };
      xhr.onerror = (): void => {
        cleanup();
        reject(new Error('Network error during upload. Check your connection and retry.'));
      };
      xhr.onabort = (): void => {
        cleanup();
        reject(new DOMException('Upload cancelled.', 'AbortError'));
      };
      xhr.open('PUT', data.signedUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  })();

  return { path, cancel: () => controller.abort(), done };
}

/** Reads natural dimensions to prefill the gallery aspect (best-effort). */
export function detectAspect(file: File, kind: UploadKind): Promise<MediaAspect> {  return new Promise((resolve) => {
    const classify = (w: number, h: number): MediaAspect => {
      if (!w || !h) return 'landscape';
      const ratio = w / h;
      if (ratio <= 0.75) return 'reel';
      if (ratio < 0.9) return 'portrait';
      if (ratio <= 1.15) return 'square';
      if (ratio < 1.6) return 'landscape';
      return 'wide';
    };
    try {
      if (kind === 'image') {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const aspect = classify(img.naturalWidth, img.naturalHeight);
          URL.revokeObjectURL(url);
          resolve(aspect);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve('landscape');
        };
        img.src = url;
      } else {
        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          const aspect = classify(video.videoWidth, video.videoHeight);
          URL.revokeObjectURL(url);
          resolve(aspect);
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
          resolve('landscape');
        };
        video.src = url;
      }
    } catch {
      resolve('landscape');
    }
  });
}

/* Keep the public-order helper name exported for clarity in tests/tools. */
export { orderBy as publicOrder };

/* ------------------------- Video frame extraction ------------------------- */

/**
 * Captures a representative JPEG frame from a video File for use as its
 * poster/thumbnail — no libraries, no uploads, no full-file reads.
 *
 * How it works: a temporary <video> opens the File through an object URL
 * (zero-copy local reference — the bytes are never parsed, encoded, or
 * duplicated), seeks to ~15% of the duration (first frames are often black;
 * very short videos safely fall back to the start), paints one frame to a
 * small canvas (capped at 640px wide), and exports a JPEG blob. The object
 * URL is always revoked. Any failure rejects — callers treat a missing
 * thumbnail as non-fatal and still save the video.
 */
export function extractVideoFrame(source: File, fraction = 0.15): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const video = document.createElement('video');
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
    let settled = false;
    const cleanup = (): void => {
      window.clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    };
    const fail = (message: string): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };
    const timer = window.setTimeout(() => fail('Could not read a video frame (timeout).'), 25000);
    video.onerror = (): void => fail('Could not read the video file.');
    video.onloadedmetadata = (): void => {
      const duration = video.duration;
      const target =
        Number.isFinite(duration) && duration > 0.4
          ? Math.min(Math.max(duration * fraction, 0.1), duration - 0.05)
          : 0;
      video.onseeked = (): void => {
        if (settled) return;
        try {
          const width = video.videoWidth;
          const height = video.videoHeight;
          if (!width || !height) {
            fail('Could not read a video frame.');
            return;
          }
          const scale = Math.min(1, 640 / width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(2, Math.round(width * scale));
          canvas.height = Math.max(2, Math.round(height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            fail('Could not read a video frame.');
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (settled) return;
            settled = true;
            cleanup();
            if (blob) resolve(blob);
            else reject(new Error('Could not read a video frame.'));
          }, 'image/jpeg', 0.82);
        } catch {
          fail('Could not read a video frame.');
        }
      };
      try {
        video.currentTime = target;
      } catch {
        fail('Could not read a video frame.');
      }
    };
    try {
      video.src = url;
    } catch {
      fail('Could not read a video frame.');
    }
  });
}
