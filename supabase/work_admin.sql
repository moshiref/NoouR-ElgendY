-- ============================================================================
-- NoouR Elgendy — Work Admin backend (Supabase)
-- ============================================================================
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → paste this entire file →
--   Run. Safe to run on a fresh project. Idempotent: re-running changes
--   nothing (no destructive DROP statements).
--
-- WHAT THIS CREATES:
--   1. work_categories table + 4 default categories (ai-video, design, ugc,
--      reviews) + indexes + updated_at trigger
--   2. work_items table + indexes + updated_at trigger
--      (includes an optional `aspect` column so the public gallery can keep
--      each piece's original ratio; it defaults to 'landscape' and the app
--      works even if every row keeps the default)
--   3. Row Level Security: public can READ visible categories + published
--      items only; all writes require a signed-in (authenticated) user.
--      NEVER put a service_role key in the website — the anon (publishable)
--      key is all the frontend needs.
--   4. A public `work-media` Storage bucket (public READ for fast <img>/<video>
--      URLs; uploads/deletes restricted to signed-in users).
--
-- ADMIN LOGIN (one time, in the Dashboard — not in this file):
--   Authentication → Users → "Add user" → create an email + password login
--   for yourself. The Admin Dashboard (/admin/work) signs in with it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------
create table if not exists public.work_categories (
  id            uuid        primary key default gen_random_uuid(),
  slug          text        unique not null,
  title         text        not null,
  display_order integer     not null default 0,
  is_visible    boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.work_items (
  id            uuid        primary key default gen_random_uuid(),
  category_id   uuid        not null references public.work_categories (id) on delete cascade,
  title         text        not null default '',
  description   text        not null default '',
  media_type    text        not null default 'image' check (media_type in ('image', 'video')),
  media_path    text        not null default '',
  thumbnail_path text       not null default '',
  -- Editorial footprint for the public gallery (reel | portrait | square |
  -- landscape | wide). Optional extension column; defaults keep old rows valid.
  aspect        text        not null default 'landscape'
                          check (aspect in ('reel', 'portrait', 'square', 'landscape', 'wide')),
  display_order integer     not null default 0,
  is_published  boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. updated_at handling (shared trigger)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_work_categories_updated_at on public.work_categories;
create trigger trg_work_categories_updated_at
  before update on public.work_categories
  for each row execute function public.set_updated_at();

drop trigger if exists trg_work_items_updated_at on public.work_items;
create trigger trg_work_items_updated_at
  before update on public.work_items
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------
create index if not exists idx_work_categories_visible_order
  on public.work_categories (is_visible, display_order);

create index if not exists idx_work_items_category_order
  on public.work_items (category_id, display_order);

create index if not exists idx_work_items_published
  on public.work_items (category_id, is_published, display_order);

-- ----------------------------------------------------------------------------
-- 4. Default categories (insert once; re-runs are no-ops)
-- ----------------------------------------------------------------------------
insert into public.work_categories (slug, title, display_order, is_visible)
values
  ('ai-video', 'AI Video',    1, true),
  ('design',   'Design',      2, true),
  ('ugc',      'UGC Creator', 3, true),
  ('reviews',  'Reviews',     4, true)
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- 5. Row Level Security — tables
--    Public: read visible categories + published items.
--    Admin (any signed-in Dashboard user): full read/write.
-- ----------------------------------------------------------------------------
alter table public.work_categories enable row level security;
alter table public.work_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'work_categories'
      and policyname = 'Public read visible categories'
  ) then
    create policy "Public read visible categories"
      on public.work_categories for select
      to anon, authenticated
      using (is_visible = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'work_categories'
      and policyname = 'Admin manage categories'
  ) then
    create policy "Admin manage categories"
      on public.work_categories for all
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'work_items'
      and policyname = 'Public read published items'
  ) then
    create policy "Public read published items"
      on public.work_items for select
      to anon, authenticated
      using (is_published = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'work_items'
      and policyname = 'Admin manage items'
  ) then
    create policy "Admin manage items"
      on public.work_items for all
      to authenticated
      using (true)
      with check (true);
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Storage — public `work-media` bucket with per-category folders
--    (ai-video/ design/ ugc/ reviews/ are created implicitly by the first
--    upload path; no per-folder setup needed.)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('work-media', 'work-media', true)
on conflict (id) do update set public = true;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Public read work media'
  ) then
    create policy "Public read work media"
      on storage.objects for select
      to anon, authenticated
      using (bucket_id = 'work-media');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admin upload work media'
  ) then
    create policy "Admin upload work media"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'work-media');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admin update work media'
  ) then
    create policy "Admin update work media"
      on storage.objects for update
      to authenticated
      using (bucket_id = 'work-media')
      with check (bucket_id = 'work-media');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Admin delete work media'
  ) then
    create policy "Admin delete work media"
      on storage.objects for delete
      to authenticated
      using (bucket_id = 'work-media');
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Done. Verify with:
--   select slug, title, display_order, is_visible from public.work_categories order by display_order;
--   select name, public from storage.buckets where id = 'work-media';
-- Then set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (see .env.example),
-- create your login (Authentication → Users), and open #/admin/work.
-- ----------------------------------------------------------------------------
