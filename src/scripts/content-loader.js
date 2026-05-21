let markedInstance = null;

const loadMarked = async () => {
  if (markedInstance) {
    return markedInstance;
  }
  const mod = await import('marked');
  markedInstance = mod.marked;
  return markedInstance;
};

const BASE_URL = import.meta.env.BASE_URL || '/';
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/** Default TTL for aggregate/list caches (localStorage + memory). */
const CACHE_TTL_MS = 30 * 60 * 1000;
/** Shorter TTL for single-post responses so edits propagate sooner. */
const CACHE_TTL_POST_MS = 10 * 60 * 1000;
/** URL query `?fresh` bypasses all readCache lookups. */
const CACHE_BUST_PARAM = 'fresh';

const getCacheTtlMs = (key) => {
  if (typeof key !== 'string') {
    return CACHE_TTL_MS;
  }
  if (key.startsWith('post:') || key.startsWith('post-preview:')) {
    return CACHE_TTL_POST_MS;
  }
  return CACHE_TTL_MS;
};
const SEARCH_AI_FUNCTION = 'search-ai';
const SEARCH_AI_MAX_ITEMS = 5;
const TALK_TOPIC_FUNCTION = 'topic-submit';
const TALK_COMMENT_FUNCTION = 'comment-submit';
const POST_COMMENT_FUNCTION = 'post-comment-submit';
const TALK_VOICE_JOIN_FUNCTION = 'voice-join';
const TALK_VOICE_HEARTBEAT_FUNCTION = 'voice-heartbeat';
const TALK_VOICE_LEAVE_FUNCTION = 'voice-leave';
const TALK_VOICE_HEARTBEAT_MS = 60000;
const memoryCache = new Map();

const canUseSessionStorage = () => typeof sessionStorage !== 'undefined';

const canUseLocalStorage = () => typeof localStorage !== 'undefined';

const getCacheKey = (key) => `emad-cache:${key}`;

const shouldBypassCache = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.has(CACHE_BUST_PARAM);
};

const readCache = (key) => {
  if (shouldBypassCache()) {
    return null;
  }
  const ttlMs = getCacheTtlMs(key);
  const now = Date.now();
  const entry = memoryCache.get(key);
  if (entry && now - entry.ts < ttlMs) {
    return entry.data;
  }

  if (entry) {
    memoryCache.delete(key);
  }

  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(getCacheKey(key));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || now - parsed.ts > ttlMs) {
      localStorage.removeItem(getCacheKey(key));
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed.data;
  } catch (error) {
    return null;
  }
};

const writeCache = (key, data) => {
  const entry = { ts: Date.now(), data };
  memoryCache.set(key, entry);

  if (!canUseLocalStorage()) {
    return;
  }

  try {
    localStorage.setItem(getCacheKey(key), JSON.stringify(entry));
  } catch (error) {
    // Ignore storage errors (quota, private mode).
  }
};

const fetchListWithCache = async ({ cacheKey, fetcher, mapFn }) => {
  const cached = readCache(cacheKey);
  if (cached) {
    return cached;
  }

  const rows = await fetcher();
  const items = mapFn ? rows.map(mapFn) : rows;
  writeCache(cacheKey, items);
  return items;
};

const fetchItemWithCache = async ({ cacheKey, fetcher, mapFn }) => {
  const cached = readCache(cacheKey);
  if (cached) {
    return cached;
  }

  const row = await fetcher();
  const item = row ? (mapFn ? mapFn(row) : row) : null;
  if (item) {
    writeCache(cacheKey, item);
  }
  return item;
};


const hasSupabaseConfig = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

const supabaseFetch = async (table, params) => {
  if (!hasSupabaseConfig()) {
    throw new Error('Missing Supabase configuration');
  }

  const searchParams = new URLSearchParams(params);
  const url = `${SUPABASE_URL}/rest/v1/${table}?${searchParams.toString()}`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase error: ${response.status}`);
  }

  return response.json();
};

const supabaseRpc = async (fn, payload) => {
  if (!hasSupabaseConfig()) {
    throw new Error('Missing Supabase configuration');
  }

  const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });

  if (!response.ok) {
    throw new Error(`Supabase RPC error: ${response.status}`);
  }

  return response.json();
};

const mapPost = (row) => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  description: row.description || null,
  publishedAt: row.published_at,
  tags: Array.isArray(row.tags) ? row.tags : [],
  contentMd: row.content_md || '',
  coverImage: row.cover_image || null,
  coverImageAlt: row.cover_image_alt || null,
});

const mapNews = (row) => ({
  id: row.id,
  title: row.title,
  source: row.source,
  url: row.url,
  summary: row.summary || null,
  publishedAt: row.published_at,
  tags: Array.isArray(row.tags) ? row.tags : [],
  readMinutes: typeof row.read_minutes === 'number' ? row.read_minutes : null,
  pinned: Boolean(row.pinned),
  featured: Boolean(row.featured),
  category: row.category || null,
  ingestSource: row.ingest_source || null,
});

const mapProject = (row) => ({
  title: row.title,
  description: row.description || null,
  url: row.url,
  tags: Array.isArray(row.tags) ? row.tags : [],
  stars: typeof row.stars === 'number' ? row.stars : null,
  language: row.language || null,
  updatedAt: row.updated_at || null,
});

const mapTopic = (row) => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  body: row.body,
  authorName: row.author_name || null,
  status: row.status,
  isLocked: Boolean(row.is_locked),
  isUnlisted: Boolean(row.is_unlisted),
  voiceEnabled: Boolean(row.voice_enabled),
  createdAt: row.created_at,
  lastActivityAt: row.last_activity_at,
});

const mapTopicComment = (row) => ({
  id: row.id,
  topicId: row.topic_id,
  body: row.body,
  authorName: row.author_name || null,
  createdAt: row.created_at,
});

const fetchPosts = async ({ limit, featuredOnly = false } = {}) => {
  const cacheKey = `posts:${featuredOnly ? 'featured' : 'all'}:${limit || 'all'}`;

  const now = new Date().toISOString();
  const params = {
    select: 'id,title,slug,description,published_at,tags,content_md,cover_image,cover_image_alt',
    draft: 'eq.false',
    published_at: `lte.${now}`,
    order: 'published_at.desc',
  };

  if (featuredOnly) {
    params.featured = 'eq.true';
  }

  if (limit) {
    params.limit = String(limit);
  }

  return fetchListWithCache({
    cacheKey,
    fetcher: () => supabaseFetch('posts', params),
    mapFn: mapPost,
  });
};

const fetchPostBySlug = async (slug) => {
  const cacheKey = `post:${slug}`;

  const now = new Date().toISOString();
  const params = {
    select: 'id,title,slug,description,published_at,tags,content_md,cover_image,cover_image_alt',
    draft: 'eq.false',
    published_at: `lte.${now}`,
    slug: `eq.${slug}`,
    limit: '1',
  };

  return fetchItemWithCache({
    cacheKey,
    fetcher: async () => {
      const rows = await supabaseFetch('posts', params);
      return rows.length > 0 ? rows[0] : null;
    },
    mapFn: mapPost,
  });
};

const fetchPostPreview = async (token) => {
  const cacheKey = `post-preview:${token}`;
  return fetchItemWithCache({
    cacheKey,
    fetcher: async () => {
      const data = await supabaseRpc('get_post_preview', { token });
      return Array.isArray(data) ? data[0] : data;
    },
    mapFn: mapPost,
  });
};

const fetchNews = async ({ limit, featuredOnly = false, pinnedOnly = false } = {}) => {
  const cacheKey = `news:${featuredOnly ? 'featured' : pinnedOnly ? 'pinned' : 'all'}:${limit || 'all'}`;

  const params = {
    select:
      'id,title,source,url,summary,published_at,tags,read_minutes,pinned,featured,category,ingest_source',
    order: 'published_at.desc',
  };

  if (featuredOnly) {
    params.featured = 'eq.true';
  }

  if (pinnedOnly) {
    params.pinned = 'eq.true';
  }

  if (limit) {
    params.limit = String(limit);
  }

  return fetchListWithCache({
    cacheKey,
    fetcher: () => supabaseFetch('news', params),
    mapFn: mapNews,
  });
};

const NEWS_VOTER_KEY = 'emad-news-voter';

const getNewsVoterKey = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    let key = localStorage.getItem(NEWS_VOTER_KEY);
    if (!key || key.length < 16) {
      key =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(NEWS_VOTER_KEY, key);
    }
    return key;
  } catch (error) {
    return `anon-${Date.now()}`;
  }
};

const invalidateNewsCaches = () => {
  for (const key of [...memoryCache.keys()]) {
    if (key.startsWith('news:')) {
      memoryCache.delete(key);
    }
  }
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith('emad-cache:') && k.includes('news:')) {
        localStorage.removeItem(k);
      }
    }
  } catch (error) {
    // Ignore storage errors.
  }
};

const fetchNewsVoteSnapshot = async (ids) => {
  if (!hasSupabaseConfig() || !ids.length) {
    return [];
  }

  const uniqueIds = [...new Set(ids)];
  const raw = await supabaseRpc('news_vote_snapshot', {
    p_news_ids: uniqueIds,
    p_voter: getNewsVoterKey(),
  });

  const rows = Array.isArray(raw) ? raw : [];
  return rows.map((row) => ({
    news_id: row.news_id,
    vote_count: Number(row.vote_count ?? 0),
    voted: Boolean(row.voted),
  }));
};

const toggleNewsVote = async (newsId) => {
  const data = await supabaseRpc('toggle_news_vote', {
    p_news_id: newsId,
    p_voter: getNewsVoterKey(),
  });
  invalidateNewsCaches();
  const voted = Boolean(data?.voted);
  const count = Number(data?.count ?? 0);
  return { voted, count };
};

const enrichNewsWithVotes = (items, snapshot) => {
  const map = new Map(snapshot.map((row) => [row.news_id, row]));
  return items.map((item) => {
    const row = map.get(item.id);
    return {
      ...item,
      voteCount: row ? row.vote_count : 0,
      voted: row ? row.voted : false,
    };
  });
};

const attachNewsVoteListeners = (container) => {
  if (!container) {
    return;
  }
  container.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-news-vote]');
    if (!btn) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const id = btn.getAttribute('data-news-id');
    if (!id || !hasSupabaseConfig()) {
      return;
    }
    btn.disabled = true;
    try {
      const { voted, count } = await toggleNewsVote(id);
      const countEl = btn.querySelector('[data-vote-count]');
      if (countEl) {
        countEl.textContent = String(count);
      }
      btn.setAttribute('aria-pressed', String(voted));
      btn.classList.toggle('text-sky-600', voted);
      btn.classList.toggle('dark:text-sky-300', voted);
    } catch (error) {
      // Ignore vote errors silently on public site.
    } finally {
      btn.disabled = false;
    }
  });
};

const fetchProjects = async ({ limit } = {}) => {
  const cacheKey = limit ? `projects:${limit}` : 'projects:all';

  const params = {
    select: 'title,description,url,tags,stars,language,updated_at',
    order: 'updated_at.desc',
  };

  if (limit) {
    params.limit = String(limit);
  }

  return fetchListWithCache({
    cacheKey,
    fetcher: () => supabaseFetch('projects', params),
    mapFn: mapProject,
  });
};

const fetchTopics = async ({ status = 'open', includeUnlisted = false } = {}) => {
  const cacheKey = `topics:${status}:${includeUnlisted ? 'all' : 'listed'}`;

  const params = {
    select:
      'id,title,slug,body,author_name,status,is_locked,is_unlisted,voice_enabled,created_at,last_activity_at',
    order: 'last_activity_at.desc',
  };

  if (status && status !== 'all') {
    params.status = `eq.${status}`;
  }

  if (!includeUnlisted) {
    params.is_unlisted = 'eq.false';
  }

  return fetchListWithCache({
    cacheKey,
    fetcher: () => supabaseFetch('topics', params),
    mapFn: mapTopic,
  });
};

const fetchTopicBySlug = async (slug) => {
  const cacheKey = `topic:${slug}`;

  const params = {
    select:
      'id,title,slug,body,author_name,status,is_locked,is_unlisted,voice_enabled,created_at,last_activity_at',
    slug: `eq.${slug}`,
    limit: '1',
  };

  return fetchItemWithCache({
    cacheKey,
    fetcher: async () => {
      const rows = await supabaseFetch('topics', params);
      return rows.length > 0 ? rows[0] : null;
    },
    mapFn: mapTopic,
  });
};

const fetchTopicComments = async (topicId) => {
  const cacheKey = `topic-comments:${topicId}`;

  const params = {
    select: 'id,topic_id,body,author_name,created_at',
    topic_id: `eq.${topicId}`,
    is_hidden: 'eq.false',
    order: 'created_at.asc',
  };

  return fetchListWithCache({
    cacheKey,
    fetcher: () => supabaseFetch('topic_comments', params),
    mapFn: mapTopicComment,
  });
};

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const getLatestDateValue = (items, getDateValue) => {
  if (!Array.isArray(items)) {
    return null;
  }

  let latest = null;
  items.forEach((item) => {
    const raw = getDateValue(item);
    if (!raw) {
      return;
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.valueOf())) {
      return;
    }
    if (!latest || parsed > latest) {
      latest = parsed;
    }
  });

  return latest;
};

const updateLastUpdated = (element, items, getDateValue) => {
  if (!element) {
    return;
  }

  const latest = getLatestDateValue(items, getDateValue);
  if (!latest) {
    element.classList.add('hidden');
    element.setAttribute('aria-hidden', 'true');
    return;
  }

  element.textContent = `Updated ${formatDate(latest)}`;
  element.classList.remove('hidden');
  element.setAttribute('aria-hidden', 'false');
};

const isImageOnlyParagraph = (paragraph) => {
  if (!paragraph) {
    return false;
  }
  const images = paragraph.querySelectorAll('img');
  if (!images.length) {
    return false;
  }

  return !Array.from(paragraph.childNodes).some((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.trim().length > 0;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      return node.tagName.toLowerCase() !== 'img';
    }
    return false;
  });
};

const enhanceMarkdown = (html) => {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;

  const paragraphs = Array.from(wrapper.querySelectorAll('p'));
  let gallery = null;
  paragraphs.forEach((paragraph) => {
    if (!isImageOnlyParagraph(paragraph)) {
      gallery = null;
      return;
    }

    if (!gallery) {
      gallery = document.createElement('div');
      gallery.className = 'markdown-gallery';
      paragraph.before(gallery);
    }

    paragraph.querySelectorAll('img').forEach((image) => {
      if (!image.getAttribute('loading')) {
        image.setAttribute('loading', 'lazy');
      }
      if (!image.getAttribute('decoding')) {
        image.setAttribute('decoding', 'async');
      }
      gallery.appendChild(image);
    });
    paragraph.remove();
  });

  wrapper.querySelectorAll('img').forEach((image) => {
    if (!image.getAttribute('loading')) {
      image.setAttribute('loading', 'lazy');
    }
    if (!image.getAttribute('decoding')) {
      image.setAttribute('decoding', 'async');
    }
  });

  return wrapper.innerHTML;
};

const renderMarkdown = (markedInstance, value) => enhanceMarkdown(markedInstance.parse(value || ''));

const setSectionState = (section, state, errorMessage) => {
  const skeleton = section.querySelector('[data-skeleton]');
  const list = section.querySelector('[data-list], [data-detail]');
  const empty = section.querySelector('[data-empty]');
  const error = section.querySelector('[data-error]');

  const setVisibility = (element, isVisible) => {
    if (!element) {
      return;
    }
    element.classList.toggle('hidden', !isVisible);
    element.setAttribute('aria-hidden', String(!isVisible));
  };

  if (skeleton) {
    skeleton.classList.toggle('hidden', state !== 'loading');
  }
  setVisibility(list, state === 'ready');
  setVisibility(empty, state === 'empty');
  setVisibility(error, state === 'error');
  if (error) {
    if (!error.dataset.defaultText) {
      error.dataset.defaultText = error.textContent || '';
    }
    if (state === 'error') {
      error.textContent = errorMessage || error.dataset.defaultText || error.textContent;
    } else if (error.dataset.defaultText) {
      error.textContent = error.dataset.defaultText;
    }
  }
  section.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
};

const getSupabaseErrorMessage = (resource, error) => {
  const label = resource ? `Unable to load ${resource}.` : 'Unable to load content.';

  if (!hasSupabaseConfig()) {
    return `${label} Supabase config is missing for this build.`;
  }

  const message = String(error?.message || '');
  const statusMatch = message.match(/\b(\d{3})\b/);
  if (statusMatch) {
    const status = statusMatch[1];
    if (status === '401' || status === '403') {
      return `${label} Supabase request denied (${status}). Check RLS for anon access.`;
    }
    if (status === '404') {
      return `${label} Supabase endpoint not found (404). Check PUBLIC_SUPABASE_URL.`;
    }
    return `${label} Supabase request failed (${status}).`;
  }

  return `${label} Supabase request failed.`;
};

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.replace(/\/+$/, '');
};

const getJitsiBaseUrl = () => normalizeBaseUrl(JITSI_BASE_URL) || 'https://meet.jit.si';

const getJitsiLabel = (baseUrl) => {
  if (!baseUrl) {
    return '';
  }
  try {
    return new URL(baseUrl).hostname || baseUrl;
  } catch (error) {
    return baseUrl;
  }
};

const isDefaultJitsi = (baseUrl) => baseUrl === 'https://meet.jit.si';

const createTalkStatusManager = (section) => {
  const panel = section?.querySelector('[data-talk-status]');
  const lines = panel?.querySelector('[data-talk-status-lines]');
  const entries = new Map();

  const styleMap = {
    ok: 'text-emerald-600 dark:text-emerald-300',
    warn: 'text-amber-600 dark:text-amber-300',
    error: 'text-rose-600 dark:text-rose-300',
  };

  const labelMap = {
    supabase: 'Data',
    voice: 'Voice',
  };

  const render = () => {
    if (!lines) {
      return;
    }
    lines.innerHTML = '';
    ['supabase', 'voice'].forEach((key) => {
      const entry = entries.get(key);
      if (!entry) {
        return;
      }
      const line = document.createElement('p');
      const className = styleMap[entry.state] || 'text-slate-600 dark:text-slate-300';
      line.className = `text-sm ${className}`;
      line.textContent = `${labelMap[key] || key}: ${entry.message}`;
      lines.appendChild(line);
    });
  };

  const set = (key, state, message) => {
    if (!lines) {
      return;
    }
    entries.set(key, { state, message });
    render();
  };

  return { set };
};

const renderTags = (container, tags, category) => {
  container.innerHTML = '';

  const entries = [];
  if (category) {
    entries.push({ label: category, variant: 'category' });
  }
  if (Array.isArray(tags) && tags.length > 0) {
    tags.forEach((tag) => entries.push({ label: tag, variant: 'tag' }));
  }

  if (entries.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  entries.forEach((entry) => {
    const span = document.createElement('span');
    span.className =
      entry.variant === 'category'
        ? 'rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs uppercase tracking-wide text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200'
        : 'rounded-full border border-slate-200 px-3 py-1 text-xs uppercase tracking-wide text-slate-600 dark:border-slate-700/60 dark:text-slate-300';
    span.textContent = entry.label;
    container.appendChild(span);
  });
};

const normalizeSearchValue = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const waitForNextPaint = () =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

const runWhenIdle = (fn) => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => fn(), { timeout: 2000 });
  } else {
    setTimeout(fn, 0);
  }
};

const buildSearchRecord = ({
  id,
  type,
  title,
  description,
  tags,
  category,
  date,
  href,
  isExternal,
  source,
  language,
  slug,
}) => {
  const safeTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  const tagTokens = safeTags
    .concat(category ? [category] : [])
    .map(normalizeSearchValue)
    .filter(Boolean);
  const titleText = normalizeSearchValue(title);
  const descriptionText = normalizeSearchValue(description);
  const tagText = tagTokens.join(' ');
  const metaText = normalizeSearchValue([source, language].filter(Boolean).join(' '));
  const searchText = [titleText, descriptionText, tagText, metaText].filter(Boolean).join(' ');

  return {
    id,
    type,
    title,
    description: description || '',
    tags: safeTags,
    category: category || null,
    date: date || null,
    href,
    isExternal: Boolean(isExternal),
    source: source || null,
    language: language || null,
    slug: slug || null,
    titleText,
    descriptionText,
    tagTokens,
    tagText,
    metaText,
    searchText,
  };
};

const buildSearchIndex = async (overrides = {}) => {
  const cacheKey = overrides.cacheKey ?? 'search-index';
  const cached = readCache(cacheKey);
  if (cached) {
    return cached;
  }

  const postsOpts = { limit: 3, featuredOnly: true, ...overrides.posts };
  const newsOpts = { limit: 3, featuredOnly: true, ...overrides.news };
  const projectsOpts = { limit: 150, ...overrides.projects };

  const [postsResult, newsResult, projectsResult] = await Promise.allSettled([
    fetchPosts(postsOpts),
    fetchNews(newsOpts),
    fetchProjects(projectsOpts),
  ]);

  const items = [];

  if (postsResult.status === 'fulfilled') {
    postsResult.value.forEach((post) => {
      items.push(
        buildSearchRecord({
          id: `post:${post.slug}`,
          type: 'post',
          title: post.title,
          description: post.description,
          tags: post.tags,
          date: post.publishedAt,
          href: `${BASE_URL}blog/?slug=${encodeURIComponent(post.slug)}`,
          isExternal: false,
          slug: post.slug,
        })
      );
    });
  }

  if (newsResult.status === 'fulfilled') {
    newsResult.value.forEach((item) => {
      items.push(
        buildSearchRecord({
          id: `news:${item.url}`,
          type: 'news',
          title: item.title,
          description: item.summary,
          tags: item.tags,
          category: item.category,
          date: item.publishedAt,
          href: item.url,
          isExternal: true,
          source: item.source,
        })
      );
    });
  }

  if (projectsResult.status === 'fulfilled') {
    projectsResult.value.forEach((project) => {
      items.push(
        buildSearchRecord({
          id: `project:${project.url}`,
          type: 'project',
          title: project.title,
          description: project.description,
          tags: project.tags,
          date: project.updatedAt,
          href: project.url,
          isExternal: true,
          language: project.language,
        })
      );
    });
  }

  writeCache(cacheKey, items);
  return items;
};

const scoreSearchItem = (item, query, tokens) => {
  if (!tokens.length) {
    return 0;
  }

  let score = 0;
  if (query && item.titleText.includes(query)) {
    score += 6;
  }
  if (query && item.descriptionText.includes(query)) {
    score += 3;
  }
  if (query && item.tagText.includes(query)) {
    score += 4;
  }

  tokens.forEach((token) => {
    if (item.titleText.includes(token)) {
      score += 2;
    }
    if (item.descriptionText.includes(token)) {
      score += 1;
    }
    if (item.tagText.includes(token)) {
      score += 2;
    }
    if (item.metaText.includes(token)) {
      score += 1;
    }
  });

  return score;
};

const searchIndexItems = (items, query, type) => {
  const normalizedQuery = normalizeSearchValue(query);
  if (!normalizedQuery) {
    return [];
  }

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const filtered = type && type !== 'all' ? items.filter((item) => item.type === type) : items;
  return filtered
    .map((item) => ({
      item,
      score: scoreSearchItem(item, normalizedQuery, tokens),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const dateA = a.item.date ? new Date(a.item.date).valueOf() : 0;
      const dateB = b.item.date ? new Date(b.item.date).valueOf() : 0;
      return dateB - dateA;
    })
    .map((entry) => entry.item);
};

const getTypeLabel = (type) => {
  if (type === 'news') {
    return 'News';
  }
  if (type === 'project') {
    return 'Project';
  }
  return 'Post';
};

const getSearchMeta = (item) => {
  if (item.type === 'news') {
    return [item.source, formatDate(item.date)].filter(Boolean).join(' · ');
  }
  if (item.type === 'project') {
    return item.date ? `Updated ${formatDate(item.date)}` : 'Project';
  }
  return formatDate(item.date);
};

const getLatestItems = (items, limit = 8) =>
  [...items]
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).valueOf() : 0;
      const dateB = b.date ? new Date(b.date).valueOf() : 0;
      return dateB - dateA;
    })
    .slice(0, limit);

const trimText = (value, maxLength) => {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const serializeAiItem = (item) => ({
  title: trimText(item.title, 120),
  description: trimText(item.description, 240),
  tags: item.tags,
  category: item.category,
  type: item.type,
  date: item.date,
  href: item.href,
  source: item.source,
  language: item.language,
});

const requestSearchAi = async (question, items) => {
  if (!hasSupabaseConfig()) {
    throw new Error('Missing Supabase configuration');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${SEARCH_AI_FUNCTION}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      items: items.map(serializeAiItem),
    }),
  });

  if (!response.ok) {
    throw new Error(`Search AI error: ${response.status}`);
  }

  const data = await response.json();
  return typeof data?.answer === 'string' ? data.answer.trim() : '';
};

const requestTopicSubmit = async ({ title, body, authorName, isUnlisted, voiceEnabled }) => {
  if (!hasSupabaseConfig()) {
    throw new Error('Missing Supabase configuration');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${TALK_TOPIC_FUNCTION}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      body,
      author_name: authorName,
      is_unlisted: Boolean(isUnlisted),
      voice_enabled: Boolean(voiceEnabled),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Topic submit failed');
  }
  return data?.topic || null;
};

const requestCommentSubmit = async ({ topicId, body, authorName }) => {
  if (!hasSupabaseConfig()) {
    throw new Error('Missing Supabase configuration');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${TALK_COMMENT_FUNCTION}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic_id: topicId,
      body,
      author_name: authorName,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Comment submit failed');
  }
  return data?.comment || null;
};

const mapPostComment = (row) => ({
  id: row.id,
  postId: row.post_id,
  body: row.body,
  authorName: row.author_name || null,
  createdAt: row.created_at,
});

const fetchPostComments = async (postId) => {
  if (!postId || !hasSupabaseConfig()) {
    return [];
  }

  const params = {
    select: 'id,post_id,body,author_name,created_at',
    post_id: `eq.${postId}`,
    is_hidden: 'eq.false',
    order: 'created_at.asc',
  };

  const rows = await supabaseFetch('post_comments', params);
  return rows.map(mapPostComment);
};

const requestPostCommentSubmit = async ({ postId, postSlug, body, authorName }) => {
  if (!hasSupabaseConfig()) {
    throw new Error('Missing Supabase configuration');
  }

  const payload = {
    body,
    author_name: authorName,
  };
  if (postId) {
    payload.post_id = postId;
  }
  if (postSlug) {
    payload.post_slug = postSlug;
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${POST_COMMENT_FUNCTION}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Comment submit failed');
  }
  return data?.comment || null;
};

const requestVoiceJoin = async ({ topicId, sessionId, displayName }) => {
  if (!hasSupabaseConfig()) {
    throw new Error('Missing Supabase configuration');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${TALK_VOICE_JOIN_FUNCTION}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic_id: topicId,
      session_id: sessionId,
      display_name: displayName || null,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 429) {
    throw new Error(data?.error || 'Voice join failed');
  }
  return data;
};

const requestVoiceHeartbeat = async ({ topicId, sessionId, displayName }) => {
  if (!hasSupabaseConfig()) {
    return;
  }

  await fetch(`${SUPABASE_URL}/functions/v1/${TALK_VOICE_HEARTBEAT_FUNCTION}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic_id: topicId,
      session_id: sessionId,
      display_name: displayName || null,
    }),
  }).catch(() => undefined);
};

const requestVoiceLeave = async ({ topicId, sessionId, keepalive = false }) => {
  if (!hasSupabaseConfig()) {
    return;
  }

  await fetch(`${SUPABASE_URL}/functions/v1/${TALK_VOICE_LEAVE_FUNCTION}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic_id: topicId,
      session_id: sessionId,
    }),
    keepalive,
  }).catch(() => undefined);
};

const renderAiSources = (container, items) => {
  if (!container) {
    return;
  }
  container.innerHTML = '';
  if (!items.length) {
    container.classList.add('hidden');
    return;
  }

  const heading = document.createElement('p');
  heading.className =
    'text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400';
  heading.textContent = 'Sources';
  container.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'mt-2 grid gap-2';

  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'flex flex-wrap items-center gap-2 text-xs';

    const badge = document.createElement('span');
    badge.className = 'text-[0.65rem] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500';
    badge.textContent = `[${index + 1}]`;

    const link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.title;
    link.className = 'font-semibold text-slate-700 hover:text-sky-700 dark:text-slate-200';
    if (item.isExternal) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }

    const meta = document.createElement('span');
    meta.className = 'text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400';
    meta.textContent = getSearchMeta(item);

    row.appendChild(badge);
    row.appendChild(link);
    row.appendChild(meta);
    list.appendChild(row);
  });

  container.appendChild(list);
  container.classList.remove('hidden');
};

const getRelatedItems = (post, items) => {
  const postTags = (post.tags || []).map(normalizeSearchValue).filter(Boolean);
  if (!postTags.length) {
    return [];
  }

  return items
    .filter((item) => !(item.type === 'post' && item.slug === post.slug))
    .map((item) => {
      const overlap = postTags.reduce(
        (count, tag) => count + (item.tagTokens.includes(tag) ? 1 : 0),
        0
      );
      return { item, score: overlap };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const dateA = a.item.date ? new Date(a.item.date).valueOf() : 0;
      const dateB = b.item.date ? new Date(b.item.date).valueOf() : 0;
      return dateB - dateA;
    })
    .map((entry) => entry.item);
};

const NEWS_SAVED_KEY = 'emad-news-saved';
const NEWS_READ_KEY = 'emad-news-read';
const NEWS_PAGE_SIZE = 24;
const NEWS_SORT_MODES = new Set(['newest', 'votes', 'pinned']);
const NEWS_TAB_MODES = new Set(['all', 'pinned', 'featured', 'saved', 'feeds']);

const INGEST_FEED_LABELS = {
  'hn-top': 'HN Top',
  'hn-new': 'HN New',
  lobsters: 'Lobsters',
  'ars-technica': 'Ars',
  'the-verge': 'Verge',
  techcrunch: 'TechCrunch',
  'github-blog': 'GitHub',
};

const formatIngestBadgeLabel = (slug) => {
  if (!slug) {
    return '';
  }
  if (INGEST_FEED_LABELS[slug]) {
    return INGEST_FEED_LABELS[slug];
  }
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const newsByDateDesc = (a, b) => new Date(b.publishedAt).valueOf() - new Date(a.publishedAt).valueOf();

const getNewsSavedIds = () => {
  if (!canUseLocalStorage()) {
    return new Set();
  }
  try {
    const raw = localStorage.getItem(NEWS_SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    return new Set();
  }
};

const setNewsSavedIds = (ids) => {
  if (!canUseLocalStorage()) {
    return;
  }
  try {
    localStorage.setItem(NEWS_SAVED_KEY, JSON.stringify([...ids]));
  } catch (error) {
    // Ignore storage errors.
  }
};

const toggleNewsSaved = (id) => {
  const saved = getNewsSavedIds();
  if (saved.has(id)) {
    saved.delete(id);
  } else {
    saved.add(id);
  }
  setNewsSavedIds(saved);
  return saved.has(id);
};

const markNewsRead = (url) => {
  if (!url || !canUseSessionStorage()) {
    return;
  }
  try {
    const raw = sessionStorage.getItem(NEWS_READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const urls = new Set(Array.isArray(parsed) ? parsed : []);
    urls.add(url);
    const trimmed = [...urls].slice(-200);
    sessionStorage.setItem(NEWS_READ_KEY, JSON.stringify(trimmed));
  } catch (error) {
    // Ignore storage errors.
  }
};

const isNewsRead = (url) => {
  if (!url || !canUseSessionStorage()) {
    return false;
  }
  try {
    const raw = sessionStorage.getItem(NEWS_READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) && parsed.includes(url);
  } catch (error) {
    return false;
  }
};

const deriveNewsFacets = (items) => {
  const sources = new Set();
  const categories = new Set();
  const tags = new Set();
  const ingestFeeds = new Set();

  items.forEach((item) => {
    if (item.source) {
      sources.add(item.source);
    }
    if (item.category) {
      categories.add(item.category);
    }
    if (Array.isArray(item.tags)) {
      item.tags.forEach((tag) => tags.add(tag));
    }
    if (item.ingestSource) {
      ingestFeeds.add(item.ingestSource);
    }
  });

  return {
    sources: [...sources].sort((a, b) => a.localeCompare(b)),
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    tags: [...tags].sort((a, b) => a.localeCompare(b)).slice(0, 24),
    ingestFeeds: [...ingestFeeds].sort((a, b) => a.localeCompare(b)),
  };
};

const filterNewsItems = (items, filters) => {
  let result = items;

  if (filters.tab === 'pinned') {
    result = result.filter((item) => item.pinned);
  } else if (filters.tab === 'featured') {
    result = result.filter((item) => item.featured);
  } else if (filters.tab === 'saved') {
    const saved = getNewsSavedIds();
    result = result.filter((item) => item.id && saved.has(item.id));
  } else if (filters.tab === 'feeds') {
    result = result.filter((item) => item.ingestSource);
    if (filters.ingestFeed) {
      result = result.filter((item) => item.ingestSource === filters.ingestFeed);
    }
  }

  if (filters.source) {
    result = result.filter((item) => item.source === filters.source);
  }

  if (filters.category) {
    result = result.filter((item) => item.category === filters.category);
  }

  if (filters.tag) {
    result = result.filter((item) => Array.isArray(item.tags) && item.tags.includes(filters.tag));
  }

  return result;
};

const sortNewsByVotes = (items) =>
  [...items].sort(
    (a, b) =>
      (b.voteCount ?? 0) - (a.voteCount ?? 0) ||
      newsByDateDesc(a, b)
  );

const sortNewsItems = (items, { sort = 'newest', rotatePinned = true } = {}) => {
  if (sort === 'votes') {
    return sortNewsByVotes(items);
  }

  const byDateDesc = newsByDateDesc;
  const pinned = items.filter((item) => item.pinned).sort(byDateDesc);
  const regular = items.filter((item) => !item.pinned).sort(byDateDesc);

  if (sort !== 'pinned') {
    return [...items].sort(byDateDesc);
  }

  if (!rotatePinned || pinned.length <= 1) {
    return pinned.concat(regular);
  }

  const rotationIndex = Math.abs(Math.floor(Date.now() / 86400000)) % pinned.length;
  const rotated = pinned.slice(rotationIndex).concat(pinned.slice(0, rotationIndex));
  return rotated.concat(regular);
};

const shareNewsItem = async (item) => {
  const payload = {
    title: item.title,
    text: item.summary || item.title,
    url: item.url,
  };

  if (navigator.share) {
    try {
      await navigator.share(payload);
      return;
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }
    }
  }

  if (navigator.clipboard?.writeText && item.url) {
    await navigator.clipboard.writeText(item.url);
  }
};

const fillNewsCard = (root, item) => {
  root.classList.toggle('opacity-70', isNewsRead(item.url));

  const link = root.querySelector('[data-news-link]');
  if (link) {
    link.href = item.url;
    link.setAttribute('aria-label', `Open news: ${item.title}`);
    link.addEventListener(
      'click',
      () => {
        markNewsRead(item.url);
        root.classList.add('opacity-70');
      },
      { once: true }
    );
  }
  const source = root.querySelector('[data-source]');
  if (source) {
    source.textContent = item.source;
  }
  const titleEl = root.querySelector('[data-title]');
  if (titleEl) {
    titleEl.textContent = item.title;
  }
  const dateEl = root.querySelector('[data-date]');
  if (dateEl) {
    const raw = item.publishedAt;
    if (raw) {
      const parsed = new Date(raw);
      if (!Number.isNaN(parsed.valueOf())) {
        dateEl.setAttribute('datetime', parsed.toISOString());
      } else {
        dateEl.removeAttribute('datetime');
      }
    } else {
      dateEl.removeAttribute('datetime');
    }
    dateEl.textContent = formatDate(item.publishedAt);
  }
  const summary = root.querySelector('[data-summary]');
  if (summary) {
    if (item.summary) {
      summary.textContent = item.summary;
      summary.classList.remove('hidden');
    } else {
      summary.classList.add('hidden');
    }
  }
  const pinned = root.querySelector('[data-pinned]');
  if (pinned) {
    pinned.classList.toggle('hidden', !item.pinned);
  }
  const autoBadge = root.querySelector('[data-auto-badge]');
  if (autoBadge) {
    if (item.ingestSource) {
      autoBadge.textContent = `Auto · ${formatIngestBadgeLabel(item.ingestSource)}`;
      autoBadge.title = `Auto-ingested from ${item.ingestSource}`;
      autoBadge.classList.remove('hidden');
    } else {
      autoBadge.textContent = '';
      autoBadge.removeAttribute('title');
      autoBadge.classList.add('hidden');
    }
  }
  const tags = root.querySelector('[data-tags]');
  if (tags) {
    renderTags(tags, item.tags, item.category);
  }
  const meta = root.querySelector('[data-meta]');
  if (meta) {
    meta.innerHTML = '';
    if (item.readMinutes) {
      const span = document.createElement('span');
      span.textContent = `${item.readMinutes} min read`;
      meta.appendChild(span);
    }
  }
  const bookmarkBtn = root.querySelector('[data-news-bookmark]');
  if (bookmarkBtn && item.id) {
    const saved = getNewsSavedIds().has(item.id);
    bookmarkBtn.setAttribute('aria-pressed', String(saved));
    bookmarkBtn.setAttribute('aria-label', saved ? 'Remove bookmark' : 'Bookmark story');
    bookmarkBtn.classList.toggle('text-sky-600', saved);
    bookmarkBtn.classList.toggle('dark:text-sky-300', saved);
  }

  const shareBtn = root.querySelector('[data-news-share]');
  if (shareBtn) {
    shareBtn.setAttribute('aria-label', `Share ${item.title}`);
  }

  const voteBtn = root.querySelector('[data-news-vote]');
  if (voteBtn && item.id) {
    voteBtn.dataset.newsId = item.id;
    voteBtn.setAttribute('aria-pressed', String(Boolean(item.voted)));
    voteBtn.classList.toggle('text-sky-600', Boolean(item.voted));
    voteBtn.classList.toggle('dark:text-sky-300', Boolean(item.voted));
    const vc = voteBtn.querySelector('[data-vote-count]');
    if (vc) {
      vc.textContent = String(item.voteCount ?? 0);
    }
  }
};

const prefetchRequests = new Map();

const prefetchPostBySlug = (slug) => {
  if (!slug || !hasSupabaseConfig()) {
    return;
  }

  if (prefetchRequests.has(slug)) {
    return;
  }

  const request = fetchPostBySlug(slug)
    .catch(() => null)
    .finally(() => {
      prefetchRequests.delete(slug);
    });

  prefetchRequests.set(slug, request);
};

const registerPostPrefetch = (link, slug) => {
  if (!link || !slug) {
    return;
  }

  const handler = () => prefetchPostBySlug(slug);
  link.addEventListener('mouseenter', handler, { passive: true });
  link.addEventListener('focus', handler);
  link.addEventListener('touchstart', handler, { passive: true });
};

export const initHome = async () => {
  const postsSection = document.querySelector('[data-home-posts]');
  const newsSection = document.querySelector('[data-home-news]');
  const projectsSection = document.querySelector('[data-home-projects]');
  const postsUpdated = document.querySelector('[data-home-updated="posts"]');
  const newsUpdated = document.querySelector('[data-home-updated="news"]');
  const projectsUpdated = document.querySelector('[data-home-updated="projects"]');

  if (!postsSection || !newsSection || !projectsSection) {
    return;
  }

  if (!hasSupabaseConfig()) {
    setSectionState(postsSection, 'error', getSupabaseErrorMessage('posts'));
    setSectionState(newsSection, 'error', getSupabaseErrorMessage('news'));
    setSectionState(projectsSection, 'error', getSupabaseErrorMessage('projects'));
    return;
  }

  setSectionState(postsSection, 'loading');
  setSectionState(newsSection, 'loading');
  setSectionState(projectsSection, 'loading');

  const [postsResult, newsResult, projectsResult] = await Promise.allSettled([
    fetchPosts({ featuredOnly: true, limit: 3 }),
    fetchNews({ pinnedOnly: true, limit: 3 }),
    fetchProjects({ limit: 150 }),
  ]);

  if (postsResult.status === 'fulfilled') {
    const allPosts = Array.isArray(postsResult.value) ? postsResult.value : [];
    updateLastUpdated(postsUpdated, allPosts, (post) => post.publishedAt);
    const posts = allPosts;
    if (!posts.length) {
      setSectionState(postsSection, 'empty');
    } else {
      const list = postsSection.querySelector('[data-list]');
      const template = postsSection.querySelector('template');
      list.innerHTML = '';
      posts.forEach((post) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.querySelector('[data-date]').textContent = formatDate(post.publishedAt);
        const link = node.querySelector('[data-link]');
        link.href = `${BASE_URL}blog/?slug=${encodeURIComponent(post.slug)}`;
        link.textContent = post.title;
        link.setAttribute('aria-label', `Read post: ${post.title}`);
        registerPostPrefetch(link, post.slug);
        const description = node.querySelector('[data-description]');
        if (post.description) {
          description.textContent = post.description;
          description.classList.remove('hidden');
        } else {
          description.classList.add('hidden');
        }
        list.appendChild(node);
      });
      setSectionState(postsSection, 'ready');
    }
  } else {
    setSectionState(postsSection, 'error', getSupabaseErrorMessage('posts', postsResult.reason));
  }

  if (newsResult.status === 'fulfilled') {
    let allNews = Array.isArray(newsResult.value) ? newsResult.value : [];
    updateLastUpdated(newsUpdated, allNews, (item) => item.publishedAt);
    allNews = [...allNews].sort(
      (a, b) => new Date(b.publishedAt).valueOf() - new Date(a.publishedAt).valueOf()
    );
    let snapshot = [];
    try {
      snapshot = await fetchNewsVoteSnapshot(allNews.map((n) => n.id));
    } catch (error) {
      snapshot = [];
    }
    const newsItems = enrichNewsWithVotes(allNews, snapshot);
    if (!newsItems.length) {
      setSectionState(newsSection, 'empty');
    } else {
      const list = newsSection.querySelector('[data-list]');
      const template = newsSection.querySelector('template');
      list.innerHTML = '';
      newsItems.forEach((item) => {
        const node = template.content.firstElementChild.cloneNode(true);
        fillNewsCard(node, item);
        list.appendChild(node);
      });
      attachNewsVoteListeners(newsSection);
      setSectionState(newsSection, 'ready');
    }
  } else {
    setSectionState(newsSection, 'error', getSupabaseErrorMessage('news', newsResult.reason));
  }

  if (projectsResult.status === 'fulfilled') {
    const allProjects = Array.isArray(projectsResult.value) ? projectsResult.value : [];
    updateLastUpdated(projectsUpdated, allProjects, (project) => project.updatedAt);
    const projects = allProjects.slice(0, 3);
    if (!projects.length) {
      setSectionState(projectsSection, 'empty');
    } else {
      const list = projectsSection.querySelector('[data-list]');
      const template = projectsSection.querySelector('template');
      list.innerHTML = '';
      projects.forEach((project) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.href = project.url;
        node.setAttribute('aria-label', `Open project: ${project.title}`);
        node.querySelector('[data-title]').textContent = project.title;
        const description = node.querySelector('[data-description]');
        if (project.description) {
          description.textContent = project.description;
          description.classList.remove('hidden');
        } else {
          description.classList.add('hidden');
        }
        const meta = node.querySelector('[data-meta]');
        meta.innerHTML = '';
        if (typeof project.stars === 'number') {
          const span = document.createElement('span');
          span.textContent = `Stars ${project.stars.toLocaleString('en-US')}`;
          meta.appendChild(span);
        }
        if (project.language) {
          const span = document.createElement('span');
          span.textContent = project.language;
          meta.appendChild(span);
        }
        if (project.updatedAt) {
          const span = document.createElement('span');
          span.textContent = `Updated ${formatDate(project.updatedAt)}`;
          meta.appendChild(span);
        }
        const tags = node.querySelector('[data-tags]');
        renderTags(tags, project.tags);
        list.appendChild(node);
      });
      setSectionState(projectsSection, 'ready');
    }
  } else {
    setSectionState(projectsSection, 'error', getSupabaseErrorMessage('projects', projectsResult.reason));
  }
};

export const initNewsPage = async () => {
  const root = document.querySelector('[data-news-root]');
  const section = root?.querySelector('[data-news-page]') || document.querySelector('[data-news-page]');
  const toolbar = root?.querySelector('[data-news-toolbar]');
  const featuredSection = root?.querySelector('[data-news-featured]');
  const loadMoreBtn = root?.querySelector('[data-news-load-more]');
  const resultSummary = root?.querySelector('[data-news-summary]');

  if (!section) {
    return;
  }

  if (!hasSupabaseConfig()) {
    setSectionState(section, 'error', getSupabaseErrorMessage('news'));
    return;
  }

  const filterEmpty = section.querySelector('[data-filter-empty]');
  const chipActiveClasses = [
    'bg-sky-100',
    'text-sky-700',
    'border-sky-200',
    'dark:bg-sky-500/10',
    'dark:text-sky-200',
    'dark:border-sky-500/40',
  ];

  let allItems = [];
  let visibleCount = NEWS_PAGE_SIZE;
  const filters = {
    tab: 'all',
    source: '',
    category: '',
    tag: '',
    ingestFeed: '',
    sort: 'newest',
  };

  const readFiltersFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab') || 'all';
    const sort = params.get('sort') || 'newest';
    filters.tab = NEWS_TAB_MODES.has(tab) ? tab : 'all';
    filters.sort = NEWS_SORT_MODES.has(sort) ? sort : 'newest';
    filters.source = params.get('source') || '';
    filters.category = params.get('category') || '';
    filters.tag = params.get('tag') || '';
    filters.ingestFeed = params.get('feed') || '';
  };

  const writeFiltersToUrl = () => {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    if (filters.tab && filters.tab !== 'all') {
      params.set('tab', filters.tab);
    } else {
      params.delete('tab');
    }
    if (filters.sort && filters.sort !== 'newest') {
      params.set('sort', filters.sort);
    } else {
      params.delete('sort');
    }
    if (filters.source) {
      params.set('source', filters.source);
    } else {
      params.delete('source');
    }
    if (filters.category) {
      params.set('category', filters.category);
    } else {
      params.delete('category');
    }
    if (filters.tag) {
      params.set('tag', filters.tag);
    } else {
      params.delete('tag');
    }
    if (filters.ingestFeed) {
      params.set('feed', filters.ingestFeed);
    } else {
      params.delete('feed');
    }
    window.history.replaceState({}, '', url);
  };

  const setChipActive = (button, isActive) => {
    if (!button) {
      return;
    }
    button.setAttribute('aria-pressed', String(isActive));
    chipActiveClasses.forEach((className) => {
      button.classList.toggle(className, isActive);
    });
  };

  const renderToolbarFacets = () => {
    if (!toolbar) {
      return;
    }

    const facets = deriveNewsFacets(allItems);
    const sourceSelect = toolbar.querySelector('[data-news-filter-source]');
    if (sourceSelect) {
      const current = filters.source;
      sourceSelect.innerHTML = '<option value="">All sources</option>';
      facets.sources.forEach((source) => {
        const option = document.createElement('option');
        option.value = source;
        option.textContent = source;
        if (source === current) {
          option.selected = true;
        }
        sourceSelect.appendChild(option);
      });
    }

    const categoryRow = toolbar.querySelector('[data-news-filter-categories]');
    if (categoryRow) {
      categoryRow.innerHTML = '';
      const allBtn = document.createElement('button');
      allBtn.type = 'button';
      allBtn.className =
        'inline-flex min-h-[44px] items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-600 transition hover:border-sky-400/60 dark:border-slate-800/60 dark:text-slate-300 sm:min-h-0';
      allBtn.textContent = 'All categories';
      allBtn.dataset.newsCategory = '';
      setChipActive(allBtn, !filters.category);
      allBtn.addEventListener('click', () => {
        filters.category = '';
        visibleCount = NEWS_PAGE_SIZE;
        writeFiltersToUrl();
        renderNewsList();
        renderToolbarFacets();
      });
      categoryRow.appendChild(allBtn);

      facets.categories.forEach((category) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = allBtn.className;
        btn.textContent = category;
        btn.dataset.newsCategory = category;
        setChipActive(btn, filters.category === category);
        btn.addEventListener('click', () => {
          filters.category = filters.category === category ? '' : category;
          visibleCount = NEWS_PAGE_SIZE;
          writeFiltersToUrl();
          renderNewsList();
          renderToolbarFacets();
        });
        categoryRow.appendChild(btn);
      });
    }

    const tagRow = toolbar.querySelector('[data-news-filter-tags]');
    if (tagRow) {
      tagRow.innerHTML = '';
      facets.tags.forEach((tag) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className =
          'inline-flex min-h-[44px] items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs uppercase tracking-wide text-slate-600 transition hover:border-sky-400/60 dark:border-slate-800/60 dark:text-slate-300 sm:min-h-0';
        btn.textContent = tag;
        btn.dataset.newsTag = tag;
        setChipActive(btn, filters.tag === tag);
        btn.addEventListener('click', () => {
          filters.tag = filters.tag === tag ? '' : tag;
          visibleCount = NEWS_PAGE_SIZE;
          writeFiltersToUrl();
          renderNewsList();
          renderToolbarFacets();
        });
        tagRow.appendChild(btn);
      });
      tagRow.classList.toggle('hidden', facets.tags.length === 0);
    }

    toolbar.querySelectorAll('[data-news-filter-tab]').forEach((button) => {
      setChipActive(button, button.dataset.newsFilterTab === filters.tab);
    });

    const sortSelect = toolbar.querySelector('[data-news-filter-sort]');
    if (sortSelect) {
      sortSelect.value = filters.sort;
    }

    const feedSelect = toolbar.querySelector('[data-news-filter-feed]');
    if (feedSelect) {
      const currentFeed = filters.ingestFeed;
      feedSelect.innerHTML = '<option value="">All feeds</option>';
      facets.ingestFeeds.forEach((slug) => {
        const option = document.createElement('option');
        option.value = slug;
        option.textContent = formatIngestBadgeLabel(slug);
        if (slug === currentFeed) {
          option.selected = true;
        }
        feedSelect.appendChild(option);
      });
      feedSelect.hidden = filters.tab !== 'feeds';
      feedSelect.disabled = filters.tab !== 'feeds';
    }
  };

  const wireNewsCardActions = (container) => {
    if (!container) {
      return;
    }

    container.querySelectorAll('[data-news-bookmark]').forEach((button) => {
      if (button.dataset.newsBound === '1') {
        return;
      }
      button.dataset.newsBound = '1';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const card = button.closest('article');
        const id = card?.querySelector('[data-news-vote]')?.dataset?.newsId;
        if (!id) {
          return;
        }
        const saved = toggleNewsSaved(id);
        button.setAttribute('aria-pressed', String(saved));
        button.setAttribute('aria-label', saved ? 'Remove bookmark' : 'Bookmark story');
        button.classList.toggle('text-sky-600', saved);
        button.classList.toggle('dark:text-sky-300', saved);
        if (filters.tab === 'saved') {
          renderNewsList();
        }
      });
    });

    container.querySelectorAll('[data-news-share]').forEach((button) => {
      if (button.dataset.newsBound === '1') {
        return;
      }
      button.dataset.newsBound = '1';
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const card = button.closest('article');
        const link = card?.querySelector('[data-news-link]');
        const title = card?.querySelector('[data-title]')?.textContent || 'Story';
        const summary = card?.querySelector('[data-summary]')?.textContent || '';
        await shareNewsItem({
          title,
          summary,
          url: link?.href || '',
        });
      });
    });
  };

  const renderNewsList = () => {
    const list = section.querySelector('[data-list]');
    const template = section.querySelector('template');

    if (!allItems.length) {
      if (filterEmpty) {
        filterEmpty.classList.add('hidden');
      }
      setSectionState(section, 'empty');
      if (toolbar) {
        toolbar.classList.add('hidden');
      }
      if (loadMoreBtn) {
        loadMoreBtn.classList.add('hidden');
      }
      if (resultSummary) {
        resultSummary.textContent = '';
      }
      return;
    }

    if (toolbar) {
      toolbar.classList.remove('hidden');
    }

    const filtered = filterNewsItems(allItems, filters);
    const sorted = sortNewsItems(filtered, {
      sort: filters.sort,
      rotatePinned: filters.sort === 'pinned',
    });
    const pageItems = sorted.slice(0, visibleCount);

    if (!filtered.length) {
      list.innerHTML = '';
      list.classList.add('hidden');
      const empty = section.querySelector('[data-empty]');
      if (empty) {
        empty.classList.add('hidden');
      }
      if (filterEmpty) {
        filterEmpty.classList.remove('hidden');
      }
      section.setAttribute('aria-busy', 'false');
      if (loadMoreBtn) {
        loadMoreBtn.classList.add('hidden');
      }
      if (resultSummary) {
        resultSummary.textContent = '0 stories match these filters.';
      }
      return;
    }

    if (filterEmpty) {
      filterEmpty.classList.add('hidden');
    }

    list.classList.remove('hidden');
    list.innerHTML = '';
    pageItems.forEach((item) => {
      const node = template.content.firstElementChild.cloneNode(true);
      fillNewsCard(node, item);
      list.appendChild(node);
    });

    attachNewsVoteListeners(section);
    wireNewsCardActions(section);
    setSectionState(section, 'ready');

    if (loadMoreBtn) {
      const hasMore = visibleCount < sorted.length;
      loadMoreBtn.classList.toggle('hidden', !hasMore);
      loadMoreBtn.disabled = !hasMore;
    }

    if (resultSummary) {
      const showing = Math.min(visibleCount, sorted.length);
      resultSummary.textContent = `Showing ${showing} of ${sorted.length} stor${sorted.length === 1 ? 'y' : 'ies'}.`;
    }
  };

  const bindToolbar = () => {
    if (!toolbar) {
      return;
    }

    toolbar.querySelectorAll('[data-news-filter-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        const tab = button.dataset.newsFilterTab || 'all';
        filters.tab = NEWS_TAB_MODES.has(tab) ? tab : 'all';
        if (filters.tab !== 'feeds') {
          filters.ingestFeed = '';
        }
        visibleCount = NEWS_PAGE_SIZE;
        writeFiltersToUrl();
        renderToolbarFacets();
        renderNewsList();
      });
    });

    const feedSelect = toolbar.querySelector('[data-news-filter-feed]');
    feedSelect?.addEventListener('change', () => {
      filters.ingestFeed = feedSelect.value || '';
      visibleCount = NEWS_PAGE_SIZE;
      writeFiltersToUrl();
      renderNewsList();
    });

    const sourceSelect = toolbar.querySelector('[data-news-filter-source]');
    sourceSelect?.addEventListener('change', () => {
      filters.source = sourceSelect.value || '';
      visibleCount = NEWS_PAGE_SIZE;
      writeFiltersToUrl();
      renderNewsList();
    });

    const sortSelect = toolbar.querySelector('[data-news-filter-sort]');
    sortSelect?.addEventListener('change', () => {
      const sort = sortSelect.value || 'newest';
      filters.sort = NEWS_SORT_MODES.has(sort) ? sort : 'newest';
      visibleCount = NEWS_PAGE_SIZE;
      writeFiltersToUrl();
      renderNewsList();
    });
  };

  loadMoreBtn?.addEventListener('click', () => {
    visibleCount += NEWS_PAGE_SIZE;
    renderNewsList();
  });

  window.addEventListener('popstate', () => {
    readFiltersFromUrl();
    visibleCount = NEWS_PAGE_SIZE;
    renderToolbarFacets();
    renderNewsList();
  });

  readFiltersFromUrl();
  bindToolbar();

  try {
    setSectionState(section, 'loading');
    if (toolbar) {
      toolbar.classList.add('hidden');
    }

    const [allNews, featuredResult] = await Promise.allSettled([
      fetchNews(),
      featuredSection ? fetchNews({ featuredOnly: true, limit: 6 }) : Promise.resolve([]),
    ]);

    if (allNews.status !== 'fulfilled') {
      throw allNews.reason;
    }

    let snapshot = [];
    try {
      snapshot = await fetchNewsVoteSnapshot(allNews.value.map((n) => n.id));
    } catch (voteError) {
      snapshot = [];
    }

    allItems = enrichNewsWithVotes(allNews.value, snapshot);

    if (featuredSection && featuredResult.status === 'fulfilled') {
      let featuredSnapshot = [];
      try {
        featuredSnapshot = await fetchNewsVoteSnapshot(featuredResult.value.map((n) => n.id));
      } catch (voteError) {
        featuredSnapshot = [];
      }
      const featuredItems = enrichNewsWithVotes(featuredResult.value, featuredSnapshot);
      const list = featuredSection.querySelector('[data-list]');
      const template = featuredSection.querySelector('template');
      if (list && template && featuredItems.length) {
        list.innerHTML = '';
        featuredItems.forEach((item) => {
          const node = template.content.firstElementChild.cloneNode(true);
          fillNewsCard(node, item);
          list.appendChild(node);
        });
        attachNewsVoteListeners(featuredSection);
        wireNewsCardActions(featuredSection);
        featuredSection.classList.remove('hidden');
      } else {
        featuredSection.classList.add('hidden');
      }
    }

    renderToolbarFacets();
    renderNewsList();
  } catch (error) {
    setSectionState(section, 'error', getSupabaseErrorMessage('news', error));
  }
};

export const initProjectsPage = async () => {
  const section = document.querySelector('[data-projects-page]');
  if (!section) {
    return;
  }

  if (!hasSupabaseConfig()) {
    setSectionState(section, 'error', getSupabaseErrorMessage('projects'));
    return;
  }

  try {
    setSectionState(section, 'loading');
    const projects = await fetchProjects();
    if (!projects.length) {
      setSectionState(section, 'empty');
    } else {
      const list = section.querySelector('[data-list]');
      const template = section.querySelector('template');
      list.innerHTML = '';
      projects.forEach((project) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.href = project.url;
        node.setAttribute('aria-label', `Open project: ${project.title}`);
        node.querySelector('[data-title]').textContent = project.title;
        const description = node.querySelector('[data-description]');
        if (project.description) {
          description.textContent = project.description;
          description.classList.remove('hidden');
        } else {
          description.classList.add('hidden');
        }
        const meta = node.querySelector('[data-meta]');
        meta.innerHTML = '';
        if (typeof project.stars === 'number') {
          const span = document.createElement('span');
          span.textContent = `Stars ${project.stars.toLocaleString('en-US')}`;
          meta.appendChild(span);
        }
        if (project.language) {
          const span = document.createElement('span');
          span.textContent = project.language;
          meta.appendChild(span);
        }
        if (project.updatedAt) {
          const span = document.createElement('span');
          span.textContent = `Updated ${formatDate(project.updatedAt)}`;
          meta.appendChild(span);
        }
        const tags = node.querySelector('[data-tags]');
        renderTags(tags, project.tags);
        list.appendChild(node);
      });
      setSectionState(section, 'ready');
    }
  } catch (error) {
    setSectionState(section, 'error', getSupabaseErrorMessage('projects', error));
  }
};

const renderRelatedSection = async (post, detailSection) => {
  const relatedSection = detailSection.querySelector('[data-related]');
  if (!relatedSection) {
    return;
  }

  const list = relatedSection.querySelector('[data-related-list]');
  const template = relatedSection.querySelector('template');
  const empty = relatedSection.querySelector('[data-related-empty]');
  const loadingEl = relatedSection.querySelector('[data-related-loading]');
  if (!list || !template || !empty) {
    return;
  }

  loadingEl?.classList.remove('hidden');
  empty.classList.add('hidden');
  list.classList.add('hidden');
  list.innerHTML = '';

  let indexItems = [];
  try {
    indexItems = await buildSearchIndex({
      cacheKey: 'search-index:related',
      posts: { limit: 50, featuredOnly: false },
      news: { limit: 12, featuredOnly: true },
      projects: { limit: 80 },
    });
  } catch (error) {
    loadingEl?.classList.add('hidden');
    empty.textContent = 'Related entries are unavailable right now.';
    empty.classList.remove('hidden');
    list.classList.add('hidden');
    return;
  }

  loadingEl?.classList.add('hidden');

  const related = getRelatedItems(post, indexItems).slice(0, 4);

  if (!related.length) {
    empty.textContent = 'No related entries yet.';
    empty.classList.remove('hidden');
    list.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.classList.remove('hidden');
  related.forEach((item) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector('[data-related-type]').textContent = getTypeLabel(item.type);
    const link = node.querySelector('[data-related-link]');
    link.href = item.href;
    link.textContent = item.title;
    if (item.isExternal) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else if (item.slug) {
      registerPostPrefetch(link, item.slug);
    }
    const description = node.querySelector('[data-related-description]');
    if (item.description) {
      description.textContent = item.description;
      description.classList.remove('hidden');
    } else {
      description.classList.add('hidden');
    }
    const tags = node.querySelector('[data-related-tags]');
    renderTags(tags, item.tags, item.category);
    list.appendChild(node);
  });
};

const initSearchAi = ({ indexItems, input }) => {
  const section = document.querySelector('[data-search-ai]');
  if (!section || !Array.isArray(indexItems)) {
    return;
  }

  if (section.hasAttribute('data-search-ai-disabled')) {
    const status = section.querySelector('[data-search-ai-status]');
    if (status && !status.textContent) {
      status.textContent = 'Search AI is temporarily unavailable.';
    }
    return;
  }

  const aiInput = section.querySelector('[data-search-ai-input]');
  const card = section.querySelector('[data-search-ai-card]');
  const runButton = section.querySelector('[data-search-ai-run]');
  const clearButton = section.querySelector('[data-search-ai-clear]');
  const status = section.querySelector('[data-search-ai-status]');
  const response = section.querySelector('[data-search-ai-response]');
  const sources = section.querySelector('[data-search-ai-sources]');

  if (!aiInput || !runButton || !status || !response || !card) {
    return;
  }

  const setStatus = (message) => {
    status.textContent = message || '';
  };

  const setCardVisible = (visible) => {
    card.classList.toggle('hidden', !visible);
    card.setAttribute('aria-hidden', String(!visible));
  };

  const showResponse = async (message) => {
    if (!message) {
      response.innerHTML = '';
      setCardVisible(false);
      return;
    }
    const marked = await loadMarked();
    response.innerHTML = renderMarkdown(marked, message);
    setCardVisible(true);
  };

  const resetResponse = () => {
    response.innerHTML = '';
    if (sources) {
      sources.innerHTML = '';
      sources.classList.add('hidden');
    }
    setCardVisible(false);
  };

  if (input?.value && !aiInput.value) {
    aiInput.value = input.value;
  }

  clearButton?.addEventListener('click', () => {
    aiInput.value = '';
    resetResponse();
    setStatus('');
  });

  runButton.addEventListener('click', async () => {
    const question = aiInput.value.trim() || input?.value.trim() || '';
    if (!question) {
      setStatus('Enter a question or search query.');
      return;
    }

    runButton.disabled = true;
    setStatus('Thinking...');
    resetResponse();

    const matches = searchIndexItems(indexItems, question, 'all');
    const contextItems = matches.length
      ? matches.slice(0, SEARCH_AI_MAX_ITEMS)
      : getLatestItems(indexItems, SEARCH_AI_MAX_ITEMS);
    if (!contextItems.length) {
      setStatus('No content available yet.');
      runButton.disabled = false;
      return;
    }

    try {
      const answer = await requestSearchAi(question, contextItems);
      if (!answer) {
        setStatus('No response returned.');
        runButton.disabled = false;
        return;
      }
      await showResponse(answer);
      renderAiSources(sources, contextItems);
      setStatus('');
    } catch (error) {
      setStatus('AI request failed.');
    } finally {
      runButton.disabled = false;
    }
  });
};

export const initTalkPage = async () => {
  const section = document.querySelector('[data-talk-page]');
  if (!section) {
    return;
  }

  const listSection = section.querySelector('[data-talk-list]');
  const filters = Array.from(section.querySelectorAll('[data-talk-filter]'));
  const form = section.querySelector('[data-talk-form]');
  const statusManager = createTalkStatusManager(section);

  if (!listSection) {
    return;
  }

  if (!hasSupabaseConfig()) {
    setSectionState(listSection, 'error', getSupabaseErrorMessage('topics'));
    statusManager.set('supabase', 'error', 'Supabase not configured.');
    return;
  }

  statusManager.set('supabase', 'ok', 'Supabase connected.');

  const jitsiBaseUrl = getJitsiBaseUrl();
  const jitsiLabel = getJitsiLabel(jitsiBaseUrl) || 'Jitsi';
  const voiceStatus = isDefaultJitsi(jitsiBaseUrl)
    ? { state: 'warn', message: 'Public Jitsi in use. Set PUBLIC_JITSI_BASE_URL.' }
    : { state: 'ok', message: `Voice ready (${jitsiLabel}).` };
  statusManager.set('voice', voiceStatus.state, voiceStatus.message);

  const list = listSection.querySelector('[data-list]');
  const template = listSection.querySelector('template');
  const empty = listSection.querySelector('[data-empty]');

  const formStatus = section.querySelector('[data-talk-form-status]');
  const titleInput = section.querySelector('[data-talk-title]');
  const bodyInput = section.querySelector('[data-talk-body]');
  const authorInput = section.querySelector('[data-talk-author]');
  const unlistedInput = section.querySelector('[data-talk-unlisted]');
  const voiceInput = section.querySelector('[data-talk-voice-toggle]');
  const formSubmit = section.querySelector('[data-talk-submit]');

  const renderList = async (status) => {
    if (!list || !template || !empty) {
      return;
    }

    setSectionState(listSection, 'loading');
    try {
      const topics = await fetchTopics({ status, includeUnlisted: false });
      list.innerHTML = '';
      if (!topics.length) {
        empty.textContent = 'No topics yet.';
        setSectionState(listSection, 'empty');
        return;
      }

      topics.forEach((topic) => {
        const node = template.content.firstElementChild.cloneNode(true);
        const meta = node.querySelector('[data-meta]');
        meta.textContent = `${topic.status === 'archived' ? 'Archived' : 'Open'} · ${formatDate(
          topic.lastActivityAt
        )}`;
        node.querySelector('[data-title]').textContent = topic.title;
        const preview = topic.body ? topic.body.slice(0, 140) : '';
        node.querySelector('[data-preview]').textContent = preview;
        const link = node.querySelector('[data-talk-link]');
        link.href = `${BASE_URL}talk/thread/?slug=${encodeURIComponent(topic.slug)}`;
        list.appendChild(node);
      });
      setSectionState(listSection, 'ready');
    } catch (error) {
      setSectionState(listSection, 'error', getSupabaseErrorMessage('topics', error));
      statusManager.set('supabase', 'error', 'Supabase request failed.');
    }
  };

  const updateUrl = (status) => {
    const url = new URL(window.location.href);
    if (status) {
      url.searchParams.set('status', status);
    } else {
      url.searchParams.delete('status');
    }
    window.history.replaceState({}, '', url);
  };

  const params = new URLSearchParams(window.location.search);
  const legacyTopic = params.get('topic');
  if (legacyTopic) {
    window.location.replace(`${BASE_URL}talk/thread/?slug=${encodeURIComponent(legacyTopic)}`);
    return;
  }
  const initialStatus = params.get('status') === 'archived' ? 'archived' : 'open';
  let activeStatus = initialStatus;

  const setActiveFilter = (value) => {
    filters.forEach((button) => {
      const isActive = button.dataset.talkFilter === value;
      button.setAttribute('aria-pressed', String(isActive));
      button.classList.toggle('bg-sky-100', isActive);
      button.classList.toggle('text-sky-700', isActive);
      button.classList.toggle('border-sky-200', isActive);
      button.classList.toggle('dark:bg-sky-500/10', isActive);
      button.classList.toggle('dark:text-sky-200', isActive);
      button.classList.toggle('dark:border-sky-500/40', isActive);
    });
  };

  renderList(initialStatus);
  setActiveFilter(initialStatus);

  filters.forEach((button) => {
    button.addEventListener('click', () => {
      const status = button.dataset.talkFilter || 'open';
      activeStatus = status;
      setActiveFilter(status);
      updateUrl(status);
      renderList(status);
    });
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!titleInput || !bodyInput) {
      return;
    }
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    const authorName = authorInput?.value.trim() || '';
    const isUnlisted = Boolean(unlistedInput?.checked);
    const voiceEnabled = Boolean(voiceInput?.checked);

    if (!title || !body) {
      if (formStatus) {
        formStatus.textContent = 'Title and topic are required.';
      }
      return;
    }

    if (formSubmit) {
      formSubmit.disabled = true;
    }
    if (formStatus) {
      formStatus.textContent = 'Publishing...';
    }

    try {
      const topic = await requestTopicSubmit({
        title,
        body,
        authorName,
        isUnlisted,
        voiceEnabled,
      });
      if (!topic) {
        throw new Error('No topic returned');
      }
      titleInput.value = '';
      bodyInput.value = '';
      if (authorInput) {
        authorInput.value = '';
      }
      if (unlistedInput) {
        unlistedInput.checked = false;
      }
      if (voiceInput) {
        voiceInput.checked = false;
      }
      window.location.href = `${BASE_URL}talk/thread/?slug=${encodeURIComponent(topic.slug)}`;
    } catch (error) {
      if (formStatus) {
        formStatus.textContent = error?.message || 'Unable to publish.';
      }
    } finally {
      if (formSubmit) {
        formSubmit.disabled = false;
      }
    }
  });

};

export const initTalkThreadPage = async () => {
  const section = document.querySelector('[data-talk-thread]');
  if (!section) {
    return;
  }

  const statusManager = createTalkStatusManager(section);
  const jitsiBaseUrl = getJitsiBaseUrl();
  const jitsiLabel = getJitsiLabel(jitsiBaseUrl) || 'Jitsi';
  const voiceServiceStatus = isDefaultJitsi(jitsiBaseUrl)
    ? { state: 'warn', message: 'Public Jitsi in use. Set PUBLIC_JITSI_BASE_URL.' }
    : { state: 'ok', message: `Voice ready (${jitsiLabel}).` };
  statusManager.set('voice', voiceServiceStatus.state, voiceServiceStatus.message);

  const params = new URLSearchParams(window.location.search);
  const slug = section.dataset.talkSlug || params.get('slug') || params.get('topic') || '';
  if (!slug) {
    const detailTitle = section.querySelector('[data-talk-detail-title]');
    const detailBody = section.querySelector('[data-talk-detail-body]');
    if (detailTitle) {
      detailTitle.textContent = 'Topic not found.';
    }
    if (detailBody) {
      detailBody.textContent = 'Missing topic link.';
    }
    return;
  }

  if (!hasSupabaseConfig()) {
    const detailTitle = section.querySelector('[data-talk-detail-title]');
    const detailBody = section.querySelector('[data-talk-detail-body]');
    if (detailTitle) {
      detailTitle.textContent = 'Unable to load topic.';
    }
    if (detailBody) {
      detailBody.textContent = getSupabaseErrorMessage('topics');
    }
    statusManager.set('supabase', 'error', 'Supabase not configured.');
    return;
  }

  statusManager.set('supabase', 'ok', 'Supabase connected.');

  const detailTitle = section.querySelector('[data-talk-detail-title]');
  const detailBody = section.querySelector('[data-talk-detail-body]');
  const detailMeta = section.querySelector('[data-talk-detail-meta]');
  const detailStatus = section.querySelector('[data-talk-detail-status]');
  const backButton = section.querySelector('[data-talk-back]');
  const copyButton = section.querySelector('[data-talk-copy]');
  const shareButton = section.querySelector('[data-talk-share]');

  const commentsSection = section.querySelector('[data-talk-comments]');
  const commentsEmpty = commentsSection?.querySelector('[data-talk-comments-empty]');
  const commentsList = commentsSection?.querySelector('[data-talk-comments-list]');
  const commentsTemplate = commentsSection?.querySelector('template');

  const commentForm = section.querySelector('[data-talk-comment-form]');
  const commentBody = section.querySelector('[data-talk-comment-body]');
  const commentAuthor = section.querySelector('[data-talk-comment-author]');
  const commentStatus = section.querySelector('[data-talk-comment-status]');
  const commentSubmit = section.querySelector('[data-talk-comment-submit]');

  const voiceSection = section.querySelector('[data-talk-voice]');
  const voiceFrame = section.querySelector('[data-talk-voice-frame]');
  const voiceJoin = section.querySelector('[data-talk-voice-join]');
  const voiceLeave = section.querySelector('[data-talk-voice-leave]');
  const voiceStatus = section.querySelector('[data-talk-voice-status]');
  const voiceCount = section.querySelector('[data-talk-voice-count]');

  let currentTopic = null;
  let voiceSession = {
    topicId: null,
    sessionId: null,
    heartbeatId: null,
    joined: false,
    displayName: null,
  };

  const formatMeta = (topic) => {
    const entries = [
      topic.status === 'archived' ? 'Archived' : 'Open',
      topic.authorName || 'Anon',
      formatDate(topic.createdAt),
      topic.isUnlisted ? 'Unlisted' : null,
      topic.voiceEnabled ? 'Voice on' : null,
    ].filter(Boolean);
    return entries;
  };

  const getVoiceSessionId = (topicId) => {
    const key = `emad-voice:${topicId}`;
    if (canUseSessionStorage()) {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        return stored;
      }
    }

    const generated = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `session-${Math.random().toString(36).slice(2)}-${Date.now()}`;

    if (canUseSessionStorage()) {
      try {
        sessionStorage.setItem(key, generated);
      } catch (error) {
        // Ignore storage errors.
      }
    }
    return generated;
  };

  const setVoiceStatus = (message) => {
    if (voiceStatus) {
      voiceStatus.textContent = message || '';
    }
  };

  const setVoiceCount = (activeCount, limit) => {
    if (!voiceCount) {
      return;
    }
    if (typeof activeCount !== 'number' || typeof limit !== 'number') {
      voiceCount.textContent = '';
      voiceCount.classList.add('hidden');
      return;
    }
    voiceCount.textContent = `${activeCount}/${limit} active`;
    voiceCount.classList.remove('hidden');
  };

  const stopVoiceHeartbeat = () => {
    if (voiceSession.heartbeatId) {
      clearInterval(voiceSession.heartbeatId);
      voiceSession.heartbeatId = null;
    }
  };

  const clearVoiceFrame = () => {
    if (!voiceFrame) {
      return;
    }
    voiceFrame.removeAttribute('src');
    voiceFrame.classList.add('hidden');
  };

  const updateVoiceControls = ({ joined, disabled }) => {
    if (voiceJoin) {
      voiceJoin.disabled = Boolean(disabled);
      voiceJoin.classList.toggle('hidden', joined);
    }
    if (voiceLeave) {
      voiceLeave.classList.toggle('hidden', !joined);
    }
  };

  const leaveVoice = async (options = {}) => {
    if (voiceSession.joined && voiceSession.topicId && voiceSession.sessionId) {
      await requestVoiceLeave({
        topicId: voiceSession.topicId,
        sessionId: voiceSession.sessionId,
        keepalive: Boolean(options.keepalive),
      });
    }
    stopVoiceHeartbeat();
    voiceSession = {
      topicId: null,
      sessionId: null,
      heartbeatId: null,
      joined: false,
      displayName: null,
    };
    updateVoiceControls({ joined: false, disabled: false });
    clearVoiceFrame();
    setVoiceStatus('');
    setVoiceCount(null, null);
  };

  const joinVoice = async (topic) => {
    if (!topic || !voiceFrame || !voiceJoin) {
      return;
    }
    if (voiceSession.joined && voiceSession.topicId === topic.id) {
      return;
    }
    await leaveVoice();

    const sessionId = getVoiceSessionId(topic.id);
    voiceSession = {
      topicId: topic.id,
      sessionId,
      heartbeatId: null,
      joined: false,
      displayName: null,
    };

    updateVoiceControls({ joined: false, disabled: true });
    setVoiceStatus('Joining voice room...');

    let result = null;
    try {
      result = await requestVoiceJoin({
        topicId: topic.id,
        sessionId,
        displayName: voiceSession.displayName,
      });
    } catch (error) {
      updateVoiceControls({ joined: false, disabled: false });
      setVoiceStatus(error?.message || 'Unable to join voice room.');
      statusManager.set('voice', 'error', 'Voice service unavailable.');
      return;
    }

    if (!result?.allowed) {
      updateVoiceControls({ joined: false, disabled: false });
      setVoiceCount(result?.activeCount, result?.limit);
      setVoiceStatus(result?.error || 'Voice room is full.');
      return;
    }

    const roomName = `emad-${topic.slug}`;
    const roomUrlBase = getJitsiBaseUrl();
    voiceFrame.src = `${roomUrlBase}/${encodeURIComponent(
      roomName
    )}#config.prejoinPageEnabled=false&config.disableAudioOutputSelection=true&config.startWithAudioMuted=true&config.startWithVideoMuted=true&config.disableVideo=true&config.disableThirdPartyRequests=true`;
    voiceFrame.classList.remove('hidden');

    voiceSession.joined = true;
    updateVoiceControls({ joined: true, disabled: false });
    setVoiceCount(result?.activeCount, result?.limit);
    setVoiceStatus('Connected.');
    statusManager.set('voice', voiceServiceStatus.state, voiceServiceStatus.message);

    voiceSession.heartbeatId = setInterval(() => {
      requestVoiceHeartbeat({
        topicId: topic.id,
        sessionId,
        displayName: voiceSession.displayName,
      });
    }, TALK_VOICE_HEARTBEAT_MS);
  };

  const setVoiceEmbed = (topic) => {
    if (!voiceSection || !voiceFrame) {
      return;
    }
    if (!topic?.voiceEnabled) {
      voiceSection.classList.add('hidden');
      voiceSection.setAttribute('aria-hidden', 'true');
      void leaveVoice();
      return;
    }
    voiceSection.classList.remove('hidden');
    voiceSection.setAttribute('aria-hidden', 'false');
    clearVoiceFrame();
    updateVoiceControls({ joined: false, disabled: false });
    setVoiceStatus('');
    setVoiceCount(null, null);

    const isLocked = topic.isLocked || topic.status === 'archived';
    if (isLocked) {
      updateVoiceControls({ joined: false, disabled: true });
      setVoiceStatus('Voice room is locked.');
    }
  };

  const renderComments = (comments) => {
    if (!commentsList || !commentsEmpty || !commentsTemplate) {
      return;
    }
    commentsList.innerHTML = '';

    if (!comments.length) {
      commentsEmpty.classList.remove('hidden');
      commentsList.classList.add('hidden');
      return;
    }

    commentsEmpty.classList.add('hidden');
    commentsList.classList.remove('hidden');
    comments.forEach((comment) => {
      const node = commentsTemplate.content.firstElementChild.cloneNode(true);
      const meta = node.querySelector('[data-comment-meta]');
      meta.textContent = `${comment.authorName || 'Anon'} · ${formatDate(comment.createdAt)}`;
      node.querySelector('[data-comment-body]').textContent = comment.body;
      commentsList.appendChild(node);
    });
  };

  const setCommentFormState = (locked, message) => {
    if (commentBody) {
      commentBody.disabled = locked;
    }
    if (commentAuthor) {
      commentAuthor.disabled = locked;
    }
    if (commentSubmit) {
      commentSubmit.disabled = locked;
    }
    if (commentStatus) {
      commentStatus.textContent = message || '';
    }
  };

  const renderThread = async () => {
    section.setAttribute('aria-busy', 'true');
    setVoiceEmbed(null);

    try {
      const topic = await fetchTopicBySlug(slug);
      if (!topic) {
        if (detailTitle) {
          detailTitle.textContent = 'Topic not found.';
        }
        if (detailBody) {
          detailBody.textContent = '';
        }
        if (detailStatus) {
          detailStatus.textContent = '';
        }
        setVoiceEmbed(null);
        return;
      }

      currentTopic = topic;
      if (detailTitle) {
        detailTitle.textContent = topic.title;
      }
      if (detailBody) {
        detailBody.textContent = topic.body;
      }
      const statusMessages = [];
      if (topic.status === 'archived') {
        statusMessages.push('Archived');
      }
      if (topic.isLocked) {
        statusMessages.push('Locked');
      }
      if (topic.isUnlisted) {
        statusMessages.push('Unlisted');
      }
      if (detailStatus) {
        detailStatus.textContent = statusMessages.length
          ? `Status: ${statusMessages.join(' · ')}`
          : '';
      }

      if (detailMeta) {
        detailMeta.innerHTML = '';
        formatMeta(topic).forEach((entry) => {
          const span = document.createElement('span');
          span.textContent = entry;
          detailMeta.appendChild(span);
        });
      }

      setVoiceEmbed(topic);

      const comments = await fetchTopicComments(topic.id);
      renderComments(comments);

      const locked = topic.isLocked || topic.status === 'archived';
      setCommentFormState(locked, locked ? 'Replies are closed.' : '');
    } catch (error) {
      if (detailTitle) {
        detailTitle.textContent = 'Unable to load topic.';
      }
      if (detailBody) {
        detailBody.textContent = '';
      }
      if (detailStatus) {
        detailStatus.textContent = '';
      }
      setVoiceEmbed(null);
      statusManager.set('supabase', 'error', 'Supabase request failed.');
    } finally {
      section.setAttribute('aria-busy', 'false');
    }
  };

  backButton?.addEventListener('click', () => {
    window.location.href = `${BASE_URL}talk/`;
  });

  copyButton?.addEventListener('click', async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      copyButton.textContent = 'Copied';
      setTimeout(() => {
        copyButton.textContent = 'Copy link';
      }, 1200);
    } catch (error) {
      copyButton.textContent = 'Copy failed';
      setTimeout(() => {
        copyButton.textContent = 'Copy link';
      }, 1200);
    }
  });

  shareButton?.addEventListener('click', async () => {
    if (!navigator.share) {
      return;
    }
    try {
      await navigator.share({
        title: detailTitle?.textContent || 'Topic',
        url: window.location.href,
      });
    } catch (error) {
      // Ignore share errors.
    }
  });

  voiceJoin?.addEventListener('click', async () => {
    if (!currentTopic) {
      return;
    }
    await joinVoice(currentTopic);
  });

  voiceLeave?.addEventListener('click', async () => {
    await leaveVoice();
    setVoiceStatus('Left voice room.');
  });

  voiceFrame?.addEventListener('error', () => {
    setVoiceStatus('Voice embed failed to load.');
    statusManager.set('voice', 'error', 'Voice service unreachable.');
  });

  window.addEventListener('beforeunload', () => {
    if (voiceSession.joined && voiceSession.topicId && voiceSession.sessionId) {
      void requestVoiceLeave({
        topicId: voiceSession.topicId,
        sessionId: voiceSession.sessionId,
        keepalive: true,
      });
    }
  });

  commentForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentTopic || !commentBody) {
      return;
    }
    const body = commentBody.value.trim();
    const authorName = commentAuthor?.value.trim() || '';
    if (!body) {
      if (commentStatus) {
        commentStatus.textContent = 'Reply text is required.';
      }
      return;
    }
    if (commentSubmit) {
      commentSubmit.disabled = true;
    }
    if (commentStatus) {
      commentStatus.textContent = 'Posting...';
    }

    try {
      const comment = await requestCommentSubmit({
        topicId: currentTopic.id,
        body,
        authorName,
      });
      if (!comment) {
        throw new Error('No comment returned');
      }
      commentBody.value = '';
      if (commentAuthor) {
        commentAuthor.value = '';
      }
      const comments = await fetchTopicComments(currentTopic.id);
      renderComments(comments);
      if (commentStatus) {
        commentStatus.textContent = '';
      }
    } catch (error) {
      if (commentStatus) {
        commentStatus.textContent = error?.message || 'Unable to post reply.';
      }
    } finally {
      if (commentSubmit) {
        commentSubmit.disabled = false;
      }
    }
  });

  await renderThread();
};

const renderBlogCommentRows = (comments, list, template, empty) => {
  if (!list || !template) {
    return;
  }

  list.innerHTML = '';
  if (!comments.length) {
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');
  comments.forEach((comment) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const meta = node.querySelector('[data-comment-meta]');
    const bodyEl = node.querySelector('[data-comment-body]');
    if (meta) {
      meta.textContent = `${comment.authorName || 'Anon'} · ${formatDate(comment.createdAt)}`;
    }
    if (bodyEl) {
      bodyEl.textContent = comment.body;
    }
    list.appendChild(node);
  });
};

const initBlogCommentsUi = async (detailSection, post) => {
  const wrap = detailSection.querySelector('[data-blog-comments-published]');
  if (!wrap || !post?.id) {
    return;
  }

  const list = wrap.querySelector('[data-blog-comments-list]');
  const empty = wrap.querySelector('[data-blog-comments-empty]');
  const template = wrap.querySelector('[data-blog-comments-template]');
  const loadingEl = wrap.querySelector('[data-blog-comments-loading]');
  const form = wrap.querySelector('[data-blog-comment-form]');
  const bodyInput = wrap.querySelector('[data-blog-comment-body]');
  const authorInput = wrap.querySelector('[data-blog-comment-author]');
  const status = wrap.querySelector('[data-blog-comment-status]');
  const submit = wrap.querySelector('[data-blog-comment-submit]');

  const load = async () => {
    try {
      const comments = await fetchPostComments(post.id);
      renderBlogCommentRows(comments, list, template, empty);
    } catch (error) {
      if (status) {
        status.textContent = 'Could not load comments.';
      }
    } finally {
      loadingEl?.classList.add('hidden');
    }
  };

  loadingEl?.classList.remove('hidden');
  empty?.classList.add('hidden');

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!bodyInput) {
      return;
    }
    const body = bodyInput.value.trim();
    const authorName = authorInput?.value.trim() || '';
    if (body.length < 3) {
      if (status) {
        status.textContent = 'Comment must be at least 3 characters.';
      }
      return;
    }
    if (submit) {
      submit.disabled = true;
    }
    if (status) {
      status.textContent = 'Posting...';
    }

    try {
      await requestPostCommentSubmit({
        postId: post.id,
        postSlug: post.slug,
        body,
        authorName,
      });
      bodyInput.value = '';
      if (authorInput) {
        authorInput.value = '';
      }
      if (status) {
        status.textContent = '';
      }
      await load();
    } catch (error) {
      if (status) {
        status.textContent = error?.message || 'Unable to post comment.';
      }
    } finally {
      if (submit) {
        submit.disabled = false;
      }
    }
  });

  await load();
};

export const initBlogPage = async () => {
  const listSection = document.querySelector('[data-blog-list]');
  const detailSection = document.querySelector('[data-blog-detail]');

  if (!listSection || !detailSection) {
    return;
  }

  if (!hasSupabaseConfig()) {
    const message = getSupabaseErrorMessage('posts');
    setSectionState(listSection, 'error', message);
    setSectionState(detailSection, 'error', message);
    return;
  }

  const defaultTitle = document.title;
  const blogListUrl = `${BASE_URL}blog/`;
  const blogPath = new URL(blogListUrl, window.location.origin).pathname;
  const listScrollKey = 'emad-blog-scroll';
  let listLoaded = false;
  let listLoadPromise = null;

  const readListScroll = () => {
    try {
      const raw = sessionStorage.getItem(listScrollKey);
      const value = raw ? Number(raw) : 0;
      return Number.isFinite(value) ? value : 0;
    } catch (error) {
      return 0;
    }
  };

  const writeListScroll = (value) => {
    try {
      sessionStorage.setItem(listScrollKey, String(value));
    } catch (error) {
      // Ignore storage errors.
    }
  };

  const updateHistory = (state, url, replace = false) => {
    if (!('history' in window)) {
      return;
    }
    try {
      if (replace) {
        window.history.replaceState(state, '', url);
      } else {
        window.history.pushState(state, '', url);
      }
    } catch (error) {
      // Ignore history failures.
    }
  };

  const getUrlState = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      slug: params.get('slug'),
      previewToken: params.get('preview'),
    };
  };

  const buildDetailUrl = (slugValue, previewValue) => {
    const params = new URLSearchParams();
    if (slugValue) {
      params.set('slug', slugValue);
    }
    if (previewValue) {
      params.set('preview', previewValue);
    }
    const query = params.toString();
    return query ? `${blogListUrl}?${query}` : blogListUrl;
  };

  const captureListScroll = () => {
    if (listSection.classList.contains('hidden')) {
      return;
    }
    writeListScroll(window.scrollY || 0);
  };

  const ensureListLoaded = async () => {
    if (listLoaded) {
      return;
    }

    if (!listLoadPromise) {
      listLoadPromise = (async () => {
        try {
          setSectionState(listSection, 'loading');
          const posts = await fetchPosts();
          if (!posts.length) {
            setSectionState(listSection, 'empty');
            listLoaded = true;
            return;
          }
          const list = listSection.querySelector('[data-list]');
          const template = listSection.querySelector('template');
          list.innerHTML = '';
          posts.forEach((post) => {
            const node = template.content.firstElementChild.cloneNode(true);
            node.querySelector('[data-date]').textContent = formatDate(post.publishedAt);
            const link = node.querySelector('[data-link]');
            link.href = buildDetailUrl(post.slug);
            link.textContent = post.title;
            link.setAttribute('aria-label', `Read post: ${post.title}`);
            link.setAttribute('data-blog-link', '');
            link.setAttribute('data-blog-slug', post.slug);
            registerPostPrefetch(link, post.slug);
            const description = node.querySelector('[data-description]');
            if (post.description) {
              description.textContent = post.description;
              description.classList.remove('hidden');
            } else {
              description.classList.add('hidden');
            }
            const tags = node.querySelector('[data-tags]');
            renderTags(tags, post.tags);
            list.appendChild(node);
          });
          setSectionState(listSection, 'ready');
          listLoaded = true;
        } catch (error) {
          setSectionState(listSection, 'error', getSupabaseErrorMessage('posts', error));
          listLoadPromise = null;
        }
      })();
    }

    await listLoadPromise;
  };

  const showList = async ({ restoreScroll = false, replaceHistory = false, updateUrl = false } = {}) => {
    detailSection.classList.add('hidden');
    listSection.classList.remove('hidden');
    await ensureListLoaded();
    document.title = defaultTitle;

    if (restoreScroll) {
      await waitForNextPaint();
      const scrollY = readListScroll();
      window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' });
    }

    if (updateUrl) {
      updateHistory({ view: 'list', scrollY: readListScroll() }, blogListUrl, replaceHistory);
    }
  };

  const showDetail = async ({ slug, previewToken, replaceHistory = false, updateUrl = false } = {}) => {
    if (!slug && !previewToken) {
      return;
    }

    listSection.classList.add('hidden');
    detailSection.classList.remove('hidden');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    if (updateUrl) {
      updateHistory({ view: 'detail', slug, previewToken }, buildDetailUrl(slug, previewToken), replaceHistory);
    }

    try {
      setSectionState(detailSection, 'loading');
      const post = previewToken ? await fetchPostPreview(previewToken) : await fetchPostBySlug(slug);
      if (!post) {
        setSectionState(detailSection, 'error', 'Unable to load post. It may be unpublished or missing.');
        return;
      }

      const previewBadge = detailSection.querySelector('[data-detail-preview]');
      if (previewBadge) {
        const isPreview = Boolean(previewToken);
        previewBadge.classList.toggle('hidden', !isPreview);
        previewBadge.setAttribute('aria-hidden', String(!isPreview));
      }

      detailSection.querySelector('[data-detail-title]').textContent = post.title;
      detailSection.querySelector('[data-detail-date]').textContent = formatDate(post.publishedAt);
      const crumb = detailSection.querySelector('[data-detail-crumb]');
      if (crumb) {
        crumb.textContent = post.title;
      }
      const description = detailSection.querySelector('[data-detail-description]');
      if (post.description) {
        description.textContent = post.description;
        description.classList.remove('hidden');
      } else {
        description.classList.add('hidden');
      }
      const tags = detailSection.querySelector('[data-detail-tags]');
      renderTags(tags, post.tags);
      const cover = detailSection.querySelector('[data-detail-cover]');
      if (cover) {
        if (post.coverImage) {
          cover.src = post.coverImage;
          cover.alt = post.coverImageAlt || post.title;
          cover.classList.remove('hidden');
        } else {
          cover.removeAttribute('src');
          cover.alt = '';
          cover.classList.add('hidden');
        }
      }
      const content = detailSection.querySelector('[data-detail-content]');
      const marked = await loadMarked();
      content.innerHTML = renderMarkdown(marked, post.contentMd || '');
      document.title = `${post.title}${previewToken ? ' (Preview)' : ''} | Emad Dev Blog`;

      const previewNote = detailSection.querySelector('[data-blog-comments-preview]');
      const publishedBlock = detailSection.querySelector('[data-blog-comments-published]');
      if (previewToken) {
        previewNote?.classList.remove('hidden');
        publishedBlock?.classList.add('hidden');
      } else {
        previewNote?.classList.add('hidden');
        publishedBlock?.classList.remove('hidden');
        publishedBlock?.querySelector('[data-blog-comments-loading]')?.classList.remove('hidden');
        publishedBlock?.querySelector('[data-blog-comments-empty]')?.classList.add('hidden');
      }

      const relatedRoot = detailSection.querySelector('[data-related]');
      relatedRoot?.querySelector('[data-related-loading]')?.classList.remove('hidden');
      relatedRoot?.querySelector('[data-related-empty]')?.classList.add('hidden');
      relatedRoot?.querySelector('[data-related-list]')?.classList.add('hidden');

      await waitForNextPaint();
      setSectionState(detailSection, 'ready');

      runWhenIdle(() => {
        void (async () => {
          try {
            await renderRelatedSection(post, detailSection);
            if (!previewToken) {
              await initBlogCommentsUi(detailSection, post);
            }
          } catch (deferredError) {
            console.error(deferredError);
          }
        })();
      });
    } catch (error) {
      setSectionState(detailSection, 'error', getSupabaseErrorMessage('post', error));
    }
  };

  const handleBlogLinkClick = (event) => {
    const link = event.target.closest('a');
    if (!link) {
      return;
    }

    if (link.hasAttribute('data-blog-back')) {
      event.preventDefault();
      showList({ restoreScroll: true, updateUrl: true });
      return;
    }

    const slugValue = link.getAttribute('data-blog-slug');
    if (slugValue) {
      event.preventDefault();
      captureListScroll();
      showDetail({ slug: slugValue, updateUrl: true });
      return;
    }

    if (!link.href) {
      return;
    }

    const url = new URL(link.href, window.location.origin);
    if (url.pathname === blogPath && url.searchParams.get('slug')) {
      event.preventDefault();
      const nextSlug = url.searchParams.get('slug');
      const nextPreview = url.searchParams.get('preview');
      showDetail({ slug: nextSlug, previewToken: nextPreview, updateUrl: true });
    }
  };

  listSection.addEventListener('click', handleBlogLinkClick);
  detailSection.addEventListener('click', handleBlogLinkClick);

  let scrollTick = false;
  window.addEventListener(
    'scroll',
    () => {
      if (scrollTick || listSection.classList.contains('hidden')) {
        return;
      }
      scrollTick = true;
      requestAnimationFrame(() => {
        scrollTick = false;
        if (!listSection.classList.contains('hidden')) {
          writeListScroll(window.scrollY || 0);
        }
      });
    },
    { passive: true }
  );

  window.addEventListener('popstate', () => {
    const { slug, previewToken } = getUrlState();
    if (slug || previewToken) {
      showDetail({ slug, previewToken });
    } else {
      showList({ restoreScroll: true });
    }
  });

  const { slug, previewToken } = getUrlState();
  if (slug || previewToken) {
    await showDetail({ slug, previewToken, updateUrl: false });
  } else {
    updateHistory({ view: 'list', scrollY: readListScroll() }, window.location.href, true);
    await showList({ restoreScroll: false, updateUrl: false });
  }
};

export const initSearchPage = async () => {
  const section = document.querySelector('[data-search-page]');
  if (!section) {
    return;
  }

  const resultsSection = section.querySelector('[data-search-results]');
  const input = section.querySelector('[data-search-input]');
  const summary = section.querySelector('[data-search-summary]');
  const filterButtons = Array.from(section.querySelectorAll('[data-search-filter]'));

  if (!resultsSection || !input) {
    return;
  }

  if (!hasSupabaseConfig()) {
    setSectionState(resultsSection, 'error', getSupabaseErrorMessage('search results'));
    return;
  }

  setSectionState(resultsSection, 'loading');

  let indexItems = [];
  try {
    indexItems = await buildSearchIndex();
  } catch (error) {
    setSectionState(resultsSection, 'error', getSupabaseErrorMessage('search results', error));
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q') || '';
  const initialType = params.get('type') || 'all';
  const validTypes = new Set(['all', 'post', 'news', 'project']);
  let activeType = validTypes.has(initialType) ? initialType : 'all';
  input.value = initialQuery;

  const activeClasses = [
    'bg-sky-100',
    'text-sky-700',
    'border-sky-200',
    'dark:bg-sky-500/10',
    'dark:text-sky-200',
    'dark:border-sky-500/40',
  ];

  const setFilterActive = (value) => {
    activeType = value;
    filterButtons.forEach((button) => {
      const isActive = button.dataset.searchFilter === value;
      button.setAttribute('aria-pressed', String(isActive));
      activeClasses.forEach((className) => {
        button.classList.toggle(className, isActive);
      });
    });
  };

  const updateUrl = (query) => {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }
    if (activeType && activeType !== 'all') {
      url.searchParams.set('type', activeType);
    } else {
      url.searchParams.delete('type');
    }
    window.history.replaceState({}, '', url);
  };

  const renderResults = () => {
    const query = input.value.trim();
    const list = resultsSection.querySelector('[data-list]');
    const template = resultsSection.querySelector('template');
    const empty = resultsSection.querySelector('[data-empty]');

    if (!list || !template || !empty) {
      return;
    }

    if (!query) {
      list.innerHTML = '';
      empty.textContent = 'Enter a keyword to search.';
      if (summary) {
        summary.textContent = '';
      }
      updateUrl('');
      setSectionState(resultsSection, 'empty');
      return;
    }

    const matches = searchIndexItems(indexItems, query, activeType);
    list.innerHTML = '';

    if (!matches.length) {
      empty.textContent = `No results for "${query}".`;
      if (summary) {
        summary.textContent = `0 results for "${query}".`;
      }
      updateUrl(query);
      setSectionState(resultsSection, 'empty');
      return;
    }

    matches.forEach((item) => {
      const node = template.content.firstElementChild.cloneNode(true);
      node.querySelector('[data-type]').textContent = getTypeLabel(item.type);
      node.querySelector('[data-date]').textContent = getSearchMeta(item);
      const link = node.querySelector('[data-title-link]');
      link.href = item.href;
      link.textContent = item.title;
      if (item.isExternal) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } else if (item.slug) {
        registerPostPrefetch(link, item.slug);
      }
      const description = node.querySelector('[data-description]');
      if (item.description) {
        description.textContent = item.description;
        description.classList.remove('hidden');
      } else {
        description.classList.add('hidden');
      }
      const tags = node.querySelector('[data-tags]');
      renderTags(tags, item.tags, item.category);
      list.appendChild(node);
    });

    if (summary) {
      const label = matches.length === 1 ? 'result' : 'results';
      summary.textContent = `Showing ${matches.length} ${label} for "${query}".`;
    }
    updateUrl(query);
    setSectionState(resultsSection, 'ready');
  };

  let searchTimer = null;
  const scheduleSearch = () => {
    if (searchTimer) {
      window.clearTimeout(searchTimer);
    }
    searchTimer = window.setTimeout(renderResults, 200);
  };

  setFilterActive(activeType);
  renderResults();

  input.addEventListener('input', scheduleSearch);
  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setFilterActive(button.dataset.searchFilter || 'all');
      renderResults();
    });
  });

  initSearchAi({ indexItems, input });
};
