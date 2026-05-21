# Deploy checklist — News UX + auto-ingest

Use this as your **manual side note**. Code may be on `development`; production still needs the steps below.

---

## 1. Supabase SQL (required once per project)

**Where:** Supabase Dashboard → **SQL Editor** → New query

**File:** [`supabase/supabase-schema.sql`](supabase/supabase-schema.sql)

Run these sections **in order** if you have not already:

| Block | What it adds |
|-------|----------------|
| Core `news` table | Base columns (skip if DB already has news) |
| `news_votes` + RPCs | Upvotes on `/news/` |
| `post_comments` | Blog comments |
| **News auto-ingest** (from `-- News auto-ingest`) | `news.ingest_source`, `news_feed_sources`, `news_ingest_log`, seed feeds |

**Minimum for auto-ingest (sprint 025):** copy from line `-- News auto-ingest` through the final `on conflict (slug) do update` seed insert.

**Verify:**

```sql
select slug, enabled, kind from public.news_feed_sources order by slug;
select column_name from information_schema.columns
  where table_name = 'news' and column_name = 'ingest_source';
```

---

## 2. Supabase Edge Function secrets

**Where:** Supabase Dashboard → **Edge Functions** → **Secrets** (or Project Settings → Edge Functions)

| Secret | Used by | Notes |
|--------|---------|--------|
| `SERVICE_ROLE_KEY` | `news-sync`, `search-ai`, etc. | Service role key from **Project Settings → API** |
| `NEWS_SYNC_SECRET` | `news-sync` | Generate a long random string; same value goes in GitHub (step 3) |

Also ensure `SUPABASE_URL` is available to functions (usually automatic).

---

## 3. Deploy `news-sync` Edge Function

**Where:** Supabase Dashboard → **Edge Functions** → Deploy, or CLI:

```sh
supabase functions deploy news-sync --project-ref <your-project-ref>
```

**Source:** [`supabase/functions/news-sync/index.ts`](supabase/functions/news-sync/index.ts)

After deploy, note the function URL:

`https://<project-ref>.supabase.co/functions/v1/news-sync`

---

## 4. Manual test (before cron)

```sh
curl -X POST "https://<project-ref>.supabase.co/functions/v1/news-sync" \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: <NEWS_SYNC_SECRET>" \
  -d '{"sources":["hn-top"]}'
```

Optional — all enabled feeds:

```sh
curl -X POST "https://<project-ref>.supabase.co/functions/v1/news-sync" \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: <NEWS_SYNC_SECRET>" \
  -d '{}'
```

**Check:**

- Response JSON: `"status":"ok"` per feed
- Table `news_ingest_log` has new rows
- Site: `/Blog/news/?fresh` shows new links with `ingest_source` set (badge in sprint 030)

---

## 5. GitHub Actions secrets (scheduled sync)

**Where:** GitHub repo → **Settings** → **Secrets and variables** → **Actions**

| Secret | Value |
|--------|--------|
| `NEWS_SYNC_URL` | Full URL from step 3 |
| `NEWS_SYNC_SECRET` | Same as Supabase secret |

**Workflow:** [`.github/workflows/news-sync.yml`](.github/workflows/news-sync.yml) — runs every **6 hours** and on **workflow_dispatch**.

**Existing Pages deploy secrets (unchanged):**

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`
- `PUBLIC_PLAUSIBLE_DOMAIN`
- `PUBLIC_JITSI_BASE_URL`

---

## 6. Git / GitHub Pages

- Merge `development` → `main` when ready for production site
- Push triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) (no extra secrets for news UX)

---

## 7. Optional: enable more feeds

**Where:** Supabase → Table Editor → `news_feed_sources`

- Set `enabled = true` for `hn-new`, or any RSS slug
- Adjust `fetch_limit` (max 100 per schema)

Or SQL:

```sql
update public.news_feed_sources set enabled = true where slug = 'hn-new';
```

---

## 8. Admin app (sprint 029)

**Where:** `admin/config.js` (copy from `admin/config.example.js`)

Add:

```js
export const NEWS_SYNC_SECRET = "<same-as-supabase-edge-secret>";
```

Serve or redeploy admin (`npm run build` copies to `dist/admin`). News tab: feeds table, Sync, ingest log, manual/auto filters.

## 9. Public site auto badge (sprint 030)

Redeploy the **site** (`npm run build` + push) so `/news/` shows **Auto · HN Top** (etc.) on synced stories and the **From feeds** filter tab. No new SQL.

Filter URL example: `/Blog/news/?tab=feeds&feed=hn-top`

---

## Quick troubleshooting

| Problem | Check |
|---------|--------|
| `Unauthorized` on curl | `NEWS_SYNC_SECRET` matches header `x-sync-secret` |
| `Missing service role` | `SERVICE_ROLE_KEY` set on Edge Function |
| No new rows | `news_feed_sources.enabled`; logs in `news_ingest_log` |
| Duplicates skipped | Expected — unique index on `news.url` |
| RSS feed errors | `last_error` on feed row; feed URL reachable from Supabase |

---

*Last updated: sprints 025–028 (schema, HN sync, RSS sync, cron workflow).*
