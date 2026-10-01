import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import type { MediaAspect, WorkCategory } from '../../data/work';
import { homeHref } from '../../lib/router';
import { getSupabase, SUPABASE_CONFIGURED } from '../../lib/supabase';
import {
  checkFileSize,
  classifyFile,
  createItem,
  deleteItem,
  detectAspect,
  extractVideoFrame,
  listAllItems,
  removePaths,
  swapOrder,
  updateItem,
  uploadMediaFile,
  uploadMediaFileProgress,
  type AdminItem,
  type TrackedUpload,
  type UploadKind,
} from '../../lib/supabaseWork';
import { workRepository } from '../../lib/workRepository';
import styles from './AdminWork.module.css';

const ASPECTS: readonly MediaAspect[] = ['reel', 'portrait', 'square', 'landscape', 'wide'];

type Notice = { kind: 'ok' | 'err'; text: string } | null;

function fileKindLabel(kind: UploadKind): string {
  return kind === 'video' ? 'Video' : 'Image';
}

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Human label for rows — titles are no longer collected, so fall back to type. */
function itemLabel(item: AdminItem): string {
  return item.title || `${item.mediaType} piece`;
}

export function AdminWork() {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [categories, setCategories] = useState<WorkCategory[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<AdminItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /* Add form */
  const [showAdd, setShowAdd] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileKind, setFileKind] = useState<UploadKind | null>(null);
  const [poster, setPoster] = useState<File | null>(null);
  const [aspect, setAspect] = useState<MediaAspect>('landscape');
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [progress, setProgress] = useState(0);
  const previewUrl = useRef<string | null>(null);
  const posterUrl = useRef<string | null>(null);
  const [previewTick, setPreviewTick] = useState(0);
  const replaceInput = useRef<HTMLInputElement | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  /* Double-submit guard (clicks racing React state) + live upload handles. */
  const saveGuard = useRef(false);
  const uploadsRef = useRef<TrackedUpload[]>([]);

  useEffect(() => {
    document.title = 'Work Admin — NoouR ElgendY';
    /* Keep the dashboard out of search results (no visual change). */
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const created = !robots;
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    const previous = robots.content;
    robots.content = 'noindex, nofollow';
    return () => {
      document.title = 'NoouR ElgendY';
      if (created) robots?.remove();
      else if (robots) robots.content = previous;
    };
  }, []);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setAuthChecked(true);
      return;
    }
    const client = getSupabase();
    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthChecked(true);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadCategories = useCallback(async () => {
    const cats = await workRepository.listVisibleCategories();
    setCategories(cats);
    setSelectedId((prev) => prev ?? cats[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (session) void loadCategories().catch(() => setNotice({ kind: 'err', text: 'Could not load categories.' }));
  }, [session, loadCategories]);

  const reloadItems = useCallback(async (categoryId: string) => {
    setLoading(true);
    try {
      setItems(await listAllItems(categoryId));
    } catch (error) {
      setNotice({ kind: 'err', text: error instanceof Error ? error.message : 'Could not load items.' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session && selectedId) void reloadItems(selectedId);
  }, [session, selectedId, reloadItems]);

  useEffect(() => {
    return () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      if (posterUrl.current) URL.revokeObjectURL(posterUrl.current);
    };
  }, []);

  const selected = categories?.find((c) => c.id === selectedId) ?? null;

  async function signIn(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) throw error;
      setPassword('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut(): Promise<void> {
    await getSupabase().auth.signOut();
    setItems(null);
    setCategories(null);
    setSelectedId(null);
  }

  function pickFile(next: File | null): void {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    if (!next) {
      setFile(null);
      setFileKind(null);
      setPreviewTick((n) => n + 1);
      return;
    }
    const kind = classifyFile(next);
    if (!kind || kind === 'poster') {
      setNotice({ kind: 'err', text: 'Unsupported file. Use JPG, PNG, WEBP, MP4, WEBM or MOV.' });
      return;
    }
    const sizeError = checkFileSize(next, kind);
    if (sizeError) {
      setNotice({ kind: 'err', text: sizeError });
      return;
    }
    previewUrl.current = URL.createObjectURL(next);
    setFile(next);
    setFileKind(kind);
    if (kind === 'image') {
      setPoster(null);
      if (posterUrl.current) URL.revokeObjectURL(posterUrl.current);
      posterUrl.current = null;
    }
    void detectAspect(next, kind).then(setAspect);
    setPreviewTick((n) => n + 1);
  }

  function pickPoster(next: File | null): void {
    if (posterUrl.current) URL.revokeObjectURL(posterUrl.current);
    posterUrl.current = null;
    if (!next) {
      setPoster(null);
      setPreviewTick((n) => n + 1);
      return;
    }
    const sizeError = checkFileSize(next, 'poster');
    if (sizeError) {
      setNotice({ kind: 'err', text: sizeError });
      return;
    }
    posterUrl.current = URL.createObjectURL(next);
    setPoster(next);
    setPreviewTick((n) => n + 1);
  }

  function cancelUpload(): void {
    uploadsRef.current.forEach((upload) => upload.cancel());
    uploadsRef.current = [];
  }

  async function saveItem(): Promise<void> {
    if (saveGuard.current) return;
    if (!selected || !file || !fileKind || fileKind === 'poster') {
      setNotice({ kind: 'err', text: 'Choose a media file from your device first.' });
      return;
    }
    saveGuard.current = true;
    setNotice(null);
    setPhase('uploading');
    setProgress(0);
    /* Both uploads start immediately and in parallel; the poster is tiny
       next to the media, so the bar tracks the main file. */
    const kind: 'image' | 'video' = fileKind === 'video' ? 'video' : 'image';
    const main = uploadMediaFileProgress(selected.slug, file, setProgress);
    uploadsRef.current = [main];
    /* Thumbnail: manual override if the admin picked a poster file,
       otherwise a frame captured from the video itself (~15% in, so we
       skip black opening frames). Runs concurrently with the upload;
       a failed auto-thumbnail never blocks saving the video. */
    const thumbTask: Promise<string> = (async (): Promise<string> => {
      if (poster) {
        const manual = uploadMediaFileProgress(selected.slug, poster);
        uploadsRef.current.push(manual);
        await manual.done;
        return manual.path;
      }
      if (kind !== 'video') return '';
      const frame = await extractVideoFrame(file).catch(() => null);
      if (!frame) return '';
      const auto = uploadMediaFileProgress(
        'thumbnails',
        new File([frame], 'frame.jpg', { type: 'image/jpeg' }),
      );
      uploadsRef.current.push(auto);
      await auto.done;
      return auto.path;
    })();
    const finished: string[] = [];
    try {
      await main.done;
      finished.push(main.path);
      /* Auto-thumbnail failure is non-fatal: the video still saves, the
         card simply falls back to its default tile. Cancellation aborts. */
      let thumbnailPath = '';
      try {
        thumbnailPath = await thumbTask;
        if (thumbnailPath) finished.push(thumbnailPath);
      } catch (thumbError) {
        if (thumbError instanceof DOMException && thumbError.name === 'AbortError') throw thumbError;
        thumbnailPath = '';
      }
      setPhase('saving');
      await createItem({
        categoryId: selected.id,
        title: '',
        description: '',
        mediaType: kind,
        mediaPath: main.path,
        thumbnailPath,
        aspect,
      });
      pickFile(null);
      pickPoster(null);
      setAspect('landscape');
      setShowAdd(false);
      const thumbExpected = Boolean(poster) || kind === 'video';
      setNotice({
        kind: 'ok',
        text:
          thumbnailPath || !thumbExpected
            ? 'Work added and published.'
            : 'Work added and published (thumbnail unavailable).',
      });
      await reloadItems(selected.id);
    } catch (error) {
      /* Never leave orphans: remove whatever finished before the failure. */
      void thumbTask.catch(() => undefined);
      await removePaths(finished);
      if (error instanceof DOMException && error.name === 'AbortError') {
        setNotice({ kind: 'err', text: 'Upload cancelled. Nothing was saved.' });
      } else {
        setNotice({ kind: 'err', text: error instanceof Error ? error.message : 'Upload failed.' });
      }
    } finally {
      uploadsRef.current = [];
      saveGuard.current = false;
      setPhase('idle');
      setProgress(0);
    }
  }

  async function togglePublish(item: AdminItem): Promise<void> {
    setBusyId(item.id);
    try {
      await updateItem(item.id, { is_published: !item.isPublished });
      if (selectedId) await reloadItems(selectedId);
    } catch (error) {
      setNotice({ kind: 'err', text: error instanceof Error ? error.message : 'Update failed.' });
    } finally {
      setBusyId(null);
    }
  }

  async function move(item: AdminItem, direction: -1 | 1): Promise<void> {
    if (!items) return;
    const at = items.findIndex((i) => i.id === item.id);
    const other = items[at + direction];
    if (at < 0 || !other) return;
    setBusyId(item.id);
    try {
      await swapOrder(item, other);
      if (selectedId) await reloadItems(selectedId);
    } catch (error) {
      setNotice({ kind: 'err', text: error instanceof Error ? error.message : 'Reorder failed.' });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: AdminItem): Promise<void> {
    if (!window.confirm(`Delete "${itemLabel(item)}"? The file will be removed too.`)) return;
    setBusyId(item.id);
    try {
      await deleteItem(item);
      setNotice({ kind: 'ok', text: 'Deleted.' });
      if (selectedId) await reloadItems(selectedId);
    } catch (error) {
      setNotice({ kind: 'err', text: error instanceof Error ? error.message : 'Delete failed.' });
    } finally {
      setBusyId(null);
    }
  }

  function askReplace(item: AdminItem): void {
    setReplacingId(item.id);
    replaceInput.current?.click();
  }

  async function replaceFile(next: File | null): Promise<void> {
    const target = items?.find((i) => i.id === replacingId);
    setReplacingId(null);
    if (!next || !target || !selected) return;
    const kind = classifyFile(next);
    if (!kind || kind === 'poster') {
      setNotice({ kind: 'err', text: 'Unsupported file. Use JPG, PNG, WEBP, MP4, WEBM or MOV.' });
      return;
    }
    const sizeError = checkFileSize(next, kind);
    if (sizeError) {
      setNotice({ kind: 'err', text: sizeError });
      return;
    }
    setBusyId(target.id);
    try {
      const mediaPath = await uploadMediaFile(selected.slug, next);
      const mediaType = kind === 'video' ? 'video' : 'image';
      const detected = await detectAspect(next, kind);
      await updateItem(target.id, { media_path: mediaPath, media_type: mediaType, aspect: detected });
      await removePaths([target.mediaPath]);
      setNotice({ kind: 'ok', text: 'Media replaced.' });
      await reloadItems(selected.id);
    } catch (error) {
      setNotice({ kind: 'err', text: error instanceof Error ? error.message : 'Replace failed.' });
    } finally {
      setBusyId(null);
      if (replaceInput.current) replaceInput.current.value = '';
    }
  }

  if (!SUPABASE_CONFIGURED) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1 className={styles.heading}>Work Admin</h1>
          <p className={styles.muted} role="status">
            Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see
            .env.example), run supabase/work_admin.sql, then reopen this page.
          </p>
          <a className={styles.btn} href={homeHref()}>
            View site
          </a>
        </div>
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.muted} role="status">
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.kicker}>Admin</p>
          <h1 className={styles.heading}>Work Admin</h1>
          <p className={styles.muted}>
            Sign in with the admin account you created in Supabase → Authentication → Users.
          </p>
          <form className={styles.form} onSubmit={signIn}>
            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {authError && (
              <p className={styles.error} role="alert">
                {authError}
              </p>
            )}
            <button className={styles.primary} type="submit" disabled={authBusy}>
              {authBusy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <a className={styles.link} href={homeHref()}>
            ← Back to site
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.kicker}>Admin</p>
            <h1 className={styles.heading}>Work</h1>
          </div>
          <div className={styles.topActions}>
            <a className={styles.btn} href={homeHref()}>
              View site
            </a>
            <button className={styles.btn} type="button" onClick={signOut} aria-label="Sign out">
              <LogOut strokeWidth={1.75} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </header>

        {notice && (
          <p className={notice.kind === 'ok' ? styles.ok : styles.error} role="status">
            {notice.text}
          </p>
        )}

        <nav className={styles.tabs} aria-label="Work categories">
          {categories?.map((category) => (
            <button
              key={category.id}
              type="button"
              className={styles.tab}
              data-active={category.id === selectedId || undefined}
              onClick={() => {
                setSelectedId(category.id);
                setShowAdd(false);
                setNotice(null);
              }}
            >
              {category.title}
            </button>
          ))}
        </nav>

        {selected && (
          <section aria-label={`${selected.title} work items`}>
            <div className={styles.sectionHead}>
              <h2 className={styles.subheading}>{selected.title}</h2>
              <button
                className={styles.primary}
                type="button"
                onClick={() => setShowAdd((open) => !open)}
              >
                <Plus strokeWidth={1.75} aria-hidden="true" />
                {showAdd ? 'Close' : 'Add Work'}
              </button>
            </div>

            {showAdd && (
              <div className={styles.panel}>
                <label className={styles.field}>
                  <span>Media from your device (JPG, PNG, WEBP, MP4, WEBM, MOV)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {file && fileKind && (
                  <p className={styles.muted}>
                    {file.name} · {fileKindLabel(fileKind)} · {formatMB(file.size)}
                    {file.size > 50 * 1024 * 1024 && (
                      <> — large file, upload may take a while on slower connections</>
                    )}
                  </p>
                )}
                {(previewUrl.current || posterUrl.current) && (
                  <div className={styles.preview} key={previewTick}>
                    {previewUrl.current && fileKind === 'video' ? (
                      <video src={previewUrl.current} controls playsInline preload="metadata" />
                    ) : previewUrl.current ? (
                      <img src={previewUrl.current} alt="Selected media preview" />
                    ) : null}
                    {posterUrl.current && (
                      <img src={posterUrl.current} alt="Poster preview" className={styles.posterPrev} />
                    )}
                  </div>
                )}
                {fileKind === 'video' && (
                  <label className={styles.field}>
                    <span>Poster image (optional override — a frame is captured automatically)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => pickPoster(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
                <label className={styles.field}>
                  <span>Gallery shape (auto-detected, adjustable)</span>
                  <select value={aspect} onChange={(e) => setAspect(e.target.value as MediaAspect)}>
                    {ASPECTS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                {phase !== 'idle' && (
                  <p className={styles.muted} role="status" aria-live="polite">
                    {phase === 'uploading'
                      ? `Uploading media… ${Math.round(progress * 100)}%`
                      : 'Saving work item…'}
                  </p>
                )}
                <div
                  className={styles.progress}
                  role={phase === 'uploading' ? 'progressbar' : undefined}
                  aria-valuemin={phase === 'uploading' ? 0 : undefined}
                  aria-valuemax={phase === 'uploading' ? 100 : undefined}
                  aria-valuenow={phase === 'uploading' ? Math.round(progress * 100) : undefined}
                >
                  <span
                    data-phase={phase}
                    style={phase === 'uploading' ? { width: `${progress * 100}%` } : undefined}
                  />
                </div>
                <div className={styles.formActions}>
                  <button
                    className={styles.primary}
                    type="button"
                    onClick={saveItem}
                    disabled={phase !== 'idle'}
                  >
                    <Upload strokeWidth={1.75} aria-hidden="true" />
                    Save work
                  </button>
                  {phase === 'uploading' && (
                    <button
                      className={styles.btn}
                      type="button"
                      onClick={cancelUpload}
                    >
                      Cancel upload
                    </button>
                  )}
                </div>
              </div>
            )}

            {loading || items === null ? (
              <p className={styles.muted} role="status">
                Loading items…
              </p>
            ) : items.length === 0 ? (
              <p className={styles.muted} role="status">
                No work in {selected.title} yet. Use “Add Work” to upload the first piece.
              </p>
            ) : (
              <ul className={styles.list}>
                {items.map((item, position) => (
                  <li key={item.id} className={styles.row}>
                    <span className={styles.thumb} aria-hidden="true">
                      {item.mediaType === 'video' && item.posterUrl ? (
                        <img src={item.posterUrl} alt="" loading="lazy" />
                      ) : item.mediaType === 'image' ? (
                        <img src={item.mediaUrl} alt="" loading="lazy" />
                      ) : (
                        <span className={styles.glyph}>{itemLabel(item).charAt(0).toUpperCase()}</span>
                      )}
                    </span>
                    <span className={styles.info}>
                      <span className={styles.rowTitle}>{itemLabel(item)}</span>
                      <span className={styles.badges}>
                        <span className={styles.badge}>#{position + 1}</span>
                        <span className={styles.badge}>{item.mediaType}</span>
                        <span
                          className={styles.badge}
                          data-state={item.isPublished ? 'on' : 'off'}
                        >
                          {item.isPublished ? 'Published' : 'Hidden'}
                        </span>
                      </span>
                    </span>
                    <span className={styles.actions}>
                      <button
                        className={styles.btn}
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => togglePublish(item)}
                        aria-label={item.isPublished ? `Unpublish ${itemLabel(item)}` : `Publish ${itemLabel(item)}`}
                      >
                        {item.isPublished ? (
                          <EyeOff strokeWidth={1.75} aria-hidden="true" />
                        ) : (
                          <Eye strokeWidth={1.75} aria-hidden="true" />
                        )}
                        {item.isPublished ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        className={styles.btn}
                        type="button"
                        disabled={busyId === item.id || position === 0}
                        onClick={() => move(item, -1)}
                        aria-label={`Move ${itemLabel(item)} up`}
                      >
                        <ArrowUp strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      <button
                        className={styles.btn}
                        type="button"
                        disabled={busyId === item.id || position === items.length - 1}
                        onClick={() => move(item, 1)}
                        aria-label={`Move ${itemLabel(item)} down`}
                      >
                        <ArrowDown strokeWidth={1.75} aria-hidden="true" />
                      </button>
                      <button
                        className={styles.btn}
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => askReplace(item)}
                        aria-label={`Replace media of ${itemLabel(item)}`}
                      >
                        <RefreshCw strokeWidth={1.75} aria-hidden="true" />
                        Replace
                      </button>
                      <button
                        className={styles.danger}
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => remove(item)}
                        aria-label={`Delete ${itemLabel(item)}`}
                      >
                        <Trash2 strokeWidth={1.75} aria-hidden="true" />
                        Delete
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <input
          ref={replaceInput}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
          onChange={(e) => {
            void replaceFile(e.target.files?.[0] ?? null);
          }}
        />
      </div>
    </div>
  );
}
