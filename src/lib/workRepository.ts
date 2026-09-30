import { useEffect, useState } from 'react';
import type { WorkCategory, WorkItem } from '../data/work';
import { SEED_CATEGORIES, SEED_ITEMS } from '../data/workSeed';
import { SUPABASE_CONFIGURED } from './supabase';
import { supabaseWorkRepository } from './supabaseWork';

/**
 * Content-access contract for everything Work-related.
 *
 * The UI NEVER touches seed data or a backend directly — only this
 * interface. All methods are async on purpose, so the future backend is a
 * drop-in replacement with zero component changes.
 *
 * ---- Supabase backend (live) ----
 * Tables/columns are defined in supabase/work_admin.sql:
 *      work_categories: id, slug (unique), title, display_order,
 *        is_visible, created_at, updated_at
 *      work_items: id, category_id (fk), title, description,
 *        media_type ('image'|'video'), media_path, thumbnail_path,
 *        aspect, display_order, is_published, created_at, updated_at
 * Storage: public bucket `work-media/`. Rows store storage PATHS
 * (`<slug>/<uuid>.<ext>`); public URLs are derived client-side via
 * `getPublicUrl` — admins never paste URLs by hand.
 * Row-level security: public SELECT where is_visible / is_published,
 * writes behind auth (see the SQL file — never a service_role key here).
 */

export interface WorkRepository {
  listVisibleCategories(): Promise<WorkCategory[]>;
  getCategoryBySlug(slug: string): Promise<WorkCategory | null>;
  listPublishedItems(categoryId: string): Promise<WorkItem[]>;
}

const byOrder = (a: { displayOrder: number }, b: { displayOrder: number }) =>
  a.displayOrder - b.displayOrder;

export class StaticWorkRepository implements WorkRepository {
  async listVisibleCategories(): Promise<WorkCategory[]> {
    return SEED_CATEGORIES.filter((c) => c.isVisible).sort(byOrder);
  }

  async getCategoryBySlug(slug: string): Promise<WorkCategory | null> {
    const needle = slug.trim().toLowerCase();
    return (
      SEED_CATEGORIES.find((c) => c.isVisible && c.slug.toLowerCase() === needle) ?? null
    );
  }

  async listPublishedItems(categoryId: string): Promise<WorkItem[]> {
    return SEED_ITEMS.filter((i) => i.categoryId === categoryId && i.isPublished).sort(
      byOrder,
    );
  }
}

/** Swap this singleton for `SupabaseWorkRepository` when the backend lands. */
export const workRepository: WorkRepository = SUPABASE_CONFIGURED
  ? supabaseWorkRepository
  : new StaticWorkRepository();

/** Which backend the public pages are reading right now (dev console aid). */
export const ACTIVE_BACKEND: 'supabase' | 'seed' = SUPABASE_CONFIGURED
  ? 'supabase'
  : 'seed';

if (import.meta.env.DEV) {
  console.info(`[work] backend: ${ACTIVE_BACKEND}`);
}

export type WorkCategoryStatus = 'loading' | 'ready' | 'not-found';

export interface WorkCategoryData {
  status: WorkCategoryStatus;
  category: WorkCategory | null;
  items: WorkItem[];
  siblings: WorkCategory[];
  index: number;
}

/** Category + its published items + ordered siblings (for prev/next). */
export function useWorkCategory(slug: string): WorkCategoryData {
  const [data, setData] = useState<WorkCategoryData>({
    status: 'loading',
    category: null,
    items: [],
    siblings: [],
    index: -1,
  });

  useEffect(() => {
    let cancelled = false;
    setData({ status: 'loading', category: null, items: [], siblings: [], index: -1 });

    (async () => {
      const [siblings, category] = await Promise.all([
        workRepository.listVisibleCategories(),
        workRepository.getCategoryBySlug(slug),
      ]);
      if (cancelled) return;
      if (!category) {
        setData({ status: 'not-found', category: null, items: [], siblings, index: -1 });
        return;
      }
      const items = await workRepository.listPublishedItems(category.id);
      if (cancelled) return;
      setData({
        status: 'ready',
        category,
        items,
        siblings,
        index: siblings.findIndex((s) => s.id === category.id),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return data;
}
