import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@12";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SITE_BASE_URL,
  NEWS_SYNC_SECRET,
} from "./config.js";

const dom = {
  authSection: document.querySelector("[data-auth]"),
  dashboardSection: document.querySelector("[data-dashboard]"),
  status: document.querySelector("[data-status]"),
  userBadge: document.querySelector("[data-user-badge]"),
  signOut: document.querySelector("[data-signout]"),
  loginForm: document.querySelector("[data-login-form]"),
  loginError: document.querySelector("[data-login-error]"),
  tabs: Array.from(document.querySelectorAll("[data-tab]")),
  resources: {
    posts: document.querySelector('[data-resource="posts"]'),
    news: document.querySelector('[data-resource="news"]'),
    topics: document.querySelector('[data-resource="topics"]'),
    projects: document.querySelector('[data-resource="projects"]'),
    activity: document.querySelector('[data-resource="activity"]'),
  },
  lists: {
    posts: document.querySelector('[data-list="posts"]'),
    news: document.querySelector('[data-list="news"]'),
    topics: document.querySelector('[data-list="topics"]'),
    topicComments: document.querySelector('[data-list="topic-comments"]'),
    projects: document.querySelector('[data-list="projects"]'),
    activity: document.querySelector('[data-list="activity"]'),
    searchAiQueries: document.querySelector('[data-list="search-ai-queries"]'),
    visitorLogs: document.querySelector('[data-list="visitor-logs"]'),
  },
  forms: {
    posts: document.querySelector('[data-form="posts"]'),
    news: document.querySelector('[data-form="news"]'),
    topics: document.querySelector('[data-form="topics"]'),
    projects: document.querySelector('[data-form="projects"]'),
  },
  newButtons: {
    posts: document.querySelector('[data-new="posts"]'),
    news: document.querySelector('[data-new="news"]'),
    topics: document.querySelector('[data-new="topics"]'),
    projects: document.querySelector('[data-new="projects"]'),
  },
  deleteButtons: {
    posts: document.querySelector('[data-delete="posts"]'),
    news: document.querySelector('[data-delete="news"]'),
    topics: document.querySelector('[data-delete="topics"]'),
    projects: document.querySelector('[data-delete="projects"]'),
  },
  topicCopy: document.querySelector('[data-topic-copy]'),
  publishNow: document.querySelector('[data-publish-now]'),
  setDraft: document.querySelector('[data-set-draft]'),
  postFilters: Array.from(document.querySelectorAll('[data-post-filter]')),
  postCounts: {
    drafts: document.querySelector('[data-post-count="drafts"]'),
    scheduled: document.querySelector('[data-post-count="scheduled"]'),
    live: document.querySelector('[data-post-count="live"]'),
  },
  postSelectAll: document.querySelector('[data-post-select-all]'),
  selectedCount: document.querySelector('[data-selected-count]'),
  bulkPublish: document.querySelector('[data-bulk-publish]'),
  bulkDraft: document.querySelector('[data-bulk-draft]'),
  bulkDelete: document.querySelector('[data-bulk-delete]'),
  bulkScheduleTime: document.querySelector('[data-bulk-schedule-time]'),
  bulkSchedule: document.querySelector('[data-bulk-schedule]'),
  newsSelectAll: document.querySelector('[data-news-select-all]'),
  newsSelectedCount: document.querySelector('[data-news-selected-count]'),
  newsBulkPin: document.querySelector('[data-news-bulk-pin]'),
  newsBulkUnpin: document.querySelector('[data-news-bulk-unpin]'),
  newsBulkDelete: document.querySelector('[data-news-bulk-delete]'),
  newsImportText: document.querySelector('[data-news-import-text]'),
  newsImportFile: document.querySelector('[data-news-import-file]'),
  newsImport: document.querySelector('[data-news-import]'),
  newsImportStatus: document.querySelector('[data-news-import-status]'),
  newsImportSampleButtons: Array.from(document.querySelectorAll("[data-news-import-sample]")),
  newsImportSampleTexts: Array.from(
    document.querySelectorAll("[data-news-import-sample-text]")
  ),
  newsAutofill: document.querySelector('[data-news-autofill]'),
  newsAutofillStatus: document.querySelector('[data-news-autofill-status]'),
  newsFeedsPanel: document.querySelector("[data-news-feeds-panel]"),
  newsFeedsTable: document.querySelector("[data-news-feeds-table]"),
  newsIngestLog: document.querySelector("[data-news-ingest-log]"),
  newsSyncAll: document.querySelector("[data-news-sync-all]"),
  newsFeedsRefresh: document.querySelector("[data-news-feeds-refresh]"),
  newsSyncStatus: document.querySelector("[data-news-sync-status]"),
  newsFilters: Array.from(document.querySelectorAll("[data-news-filter]")),
  newsIngestSourceFilter: document.querySelector("[data-news-ingest-source-filter]"),
  newsAutoDeleteSource: document.querySelector("[data-news-auto-delete-source]"),
  newsAutoDelete: document.querySelector("[data-news-auto-delete]"),
  newsCounts: document.querySelector("[data-news-counts]"),
  newsIngestNote: document.querySelector("[data-news-ingest-note]"),
  newsIngestPill: document.querySelector("[data-news-ingest-pill]"),
  adminConsoleList: document.querySelector("[data-admin-console-list]"),
  adminConsoleClear: document.querySelector("[data-admin-console-clear]"),
  projectsSelectAll: document.querySelector('[data-projects-select-all]'),
  projectsSelectedCount: document.querySelector('[data-projects-selected-count]'),
  projectsBulkDelete: document.querySelector('[data-projects-bulk-delete]'),
  savePost: document.querySelector('[data-save-post]'),
  slugError: document.querySelector('[data-slug-error]'),
  postError: document.querySelector('[data-post-error]'),
  publishHint: document.querySelector('[data-publish-hint]'),
  readinessStatus: document.querySelector('[data-readiness-status]'),
  readinessList: document.querySelector('[data-readiness-list]'),
  refreshActivity: document.querySelector('[data-refresh-activity]'),
  activityResourceFilters: Array.from(document.querySelectorAll('[data-activity-resource]')),
  activityActionFilters: Array.from(document.querySelectorAll('[data-activity-action]')),
  topicFilters: Array.from(document.querySelectorAll('[data-topic-filter]')),
  scheduledQueue: document.querySelector('[data-scheduled-queue]'),
  scheduleReminder: document.querySelector('[data-schedule-reminder]'),
  cleanPreviews: document.querySelector('[data-clean-previews]'),
  cleanPreviewsStatus: document.querySelector('[data-clean-previews-status]'),
  coverFile: document.querySelector('[data-cover-file]'),
  coverStatus: document.querySelector('[data-cover-status]'),
  previewGenerate: document.querySelector('[data-preview-generate]'),
  postPreview: {
    container: document.querySelector("[data-preview]"),
    meta: document.querySelector("[data-preview-meta]"),
    title: document.querySelector("[data-preview-title]"),
    description: document.querySelector("[data-preview-description]"),
    body: document.querySelector("[data-preview-body]"),
    link: document.querySelector("[data-preview-link]"),
    note: document.querySelector("[data-preview-note]"),
    cover: document.querySelector("[data-preview-cover]"),
  },
  projectUpdated: document.querySelector("[data-project-updated]"),
};

const state = {
  active: "posts",
  items: {
    posts: [],
    news: [],
    topics: [],
    topicComments: [],
    projects: [],
    activity: [],
    searchAiQueries: [],
    visitorLogs: [],
  },
  selected: {
    posts: null,
    news: null,
    topics: null,
    projects: null,
  },
  session: null,
  isAdmin: false,
  slugTouched: false,
  previewTokens: new Map(),
  postFilter: "all",
  selectedPostIds: new Set(),
  visiblePostIds: [],
  selectedNewsIds: new Set(),
  visibleNewsIds: [],
  selectedTopicIds: new Set(),
  visibleTopicIds: [],
  selectedProjectIds: new Set(),
  visibleProjectIds: [],
  topicFilter: "open",
  activityFilters: {
    resource: "all",
    action: "all",
  },
  newsFilter: "all",
  newsIngestSourceFilter: "",
  feedSources: [],
  ingestLogs: [],
  newsSyncInFlight: false,
  newsSyncActiveSlug: null,
  adminConsole: [],
};

const normalizeBaseUrl = (value) => {
  if (!value) {
    return `${window.location.origin}/`;
  }
  return value.endsWith("/") ? value : `${value}/`;
};

const siteBaseUrl = normalizeBaseUrl(SITE_BASE_URL);
const hasConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const NEWS_ENRICH_FUNCTION = "news-enrich";
const NEWS_SYNC_FUNCTION = "news-sync";
const hasSyncSecret = Boolean(NEWS_SYNC_SECRET && String(NEWS_SYNC_SECRET).trim());
const ADMIN_CONSOLE_MAX = 14;
const NEWS_FILTER_LABELS = {
  all: "All",
  manual: "Manual",
  auto: "Auto-ingested",
};

const INGEST_FEED_LABELS = {
  "hn-top": "HN Top",
  "hn-new": "HN New",
  lobsters: "Lobsters",
  "ars-technica": "Ars",
  "the-verge": "Verge",
  techcrunch: "TechCrunch",
  "github-blog": "GitHub",
};

const formatIngestFeedLabel = (slug) => {
  if (!slug) {
    return "";
  }
  if (INGEST_FEED_LABELS[slug]) {
    return INGEST_FEED_LABELS[slug];
  }
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const supabase = hasConfig ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let newsAutofillInFlight = false;
let lastNewsAutofillUrl = "";
let newsAutofillTimer = null;

const setHidden = (element, hidden) => {
  if (!element) {
    return;
  }
  element.classList.toggle("hidden", hidden);
};

const setStatus = (message, tone = "info") => {
  if (!dom.status) {
    return;
  }
  dom.status.textContent = message || "";
  dom.status.dataset.tone = tone;
};

const pushAdminConsole = ({ action, message, tone = "info", detail = null }) => {
  if (!message) {
    return;
  }
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date(),
    action: action || "action",
    message,
    tone,
    detail,
  };
  state.adminConsole = [entry, ...(state.adminConsole || [])].slice(0, ADMIN_CONSOLE_MAX);
  renderAdminConsole();
  const logPayload = detail ? { detail } : undefined;
  const logFn =
    tone === "error" ? console.error : tone === "success" ? console.info : console.log;
  logFn(`[Emad Admin · ${entry.action}]`, message, logPayload);
};

const renderAdminConsole = () => {
  const list = dom.adminConsoleList;
  if (!list) {
    return;
  }
  const entries = state.adminConsole || [];
  if (!entries.length) {
    list.innerHTML = '<li class="admin-console-empty muted">Actions on this tab appear here and in the browser console.</li>';
    return;
  }
  list.innerHTML = entries
    .map((entry) => {
      const time = entry.at.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      return `<li class="admin-console-line" data-tone="${escapeHtml(entry.tone)}">
        <span class="admin-console-time">${escapeHtml(time)}</span>
        <span class="admin-console-action">${escapeHtml(entry.action)}</span>
        <span class="admin-console-msg">${escapeHtml(entry.message)}</span>
      </li>`;
    })
    .join("");
};

const replayNews = (action, message, tone = "info", detail = null) => {
  setStatus(message, tone);
  pushAdminConsole({ action, message, tone, detail });
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRelativeTime = (value) => {
  if (!value) {
    return "";
  }
  const target = new Date(value);
  if (Number.isNaN(target.valueOf())) {
    return "";
  }
  const diffMs = target.getTime() - Date.now();
  if (diffMs <= 0) {
    return "now";
  }
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) {
    return `in ${minutes}m`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `in ${hours}h`;
  }
  const days = Math.round(hours / 24);
  return `in ${days}d`;
};

const formatActor = (actorId) => {
  if (!actorId) {
    return null;
  }
  if (actorId === state.session?.user?.id) {
    return "you";
  }
  return "team";
};

const joinMeta = (parts) => parts.filter(Boolean).join(" · ");

const PREVIEW_TOKEN_DAYS = 7;

const setFieldMessage = (element, message) => {
  if (!element) {
    return;
  }
  if (message) {
    element.textContent = message;
    element.classList.remove("hidden");
  } else {
    element.textContent = "";
    element.classList.add("hidden");
  }
};

const setNewsAutofillStatus = (message) => {
  setFieldMessage(dom.newsAutofillStatus, message);
};

const setCleanPreviewsStatus = (message) => {
  if (!dom.cleanPreviewsStatus) {
    return;
  }
  dom.cleanPreviewsStatus.textContent = message || "";
};

const setNewsImportStatus = (message) => {
  if (!dom.newsImportStatus) {
    return;
  }
  dom.newsImportStatus.textContent = message || "";
};

const getNewsImportSampleText = (type) => {
  if (!type || !dom.newsImportSampleTexts?.length) {
    return "";
  }
  const sample = dom.newsImportSampleTexts.find(
    (node) => node.dataset.newsImportSampleText === type
  );
  return sample ? sample.textContent.trim() : "";
};

const applyNewsImportSample = (type) => {
  if (!dom.newsImportText) {
    return;
  }
  const sample = getNewsImportSampleText(type);
  if (!sample) {
    setNewsImportStatus("Sample not available.");
    return;
  }
  dom.newsImportText.value = sample;
  dom.newsImportText.focus();
  setNewsImportStatus(`Loaded ${type.toUpperCase()} sample.`);
};

const setCoverStatus = (message) => {
  if (!dom.coverStatus) {
    return;
  }
  dom.coverStatus.textContent = message || "";
};

const generateToken = () => {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const getCoverExtension = (filename) => {
  const parts = filename.split(".");
  if (parts.length < 2) {
    return "jpg";
  }
  return parts.pop().toLowerCase();
};

const buildCoverPath = (slug, filename) => {
  const safeSlug = slug || "post";
  const extension = getCoverExtension(filename);
  const token = generateToken().slice(0, 12);
  return `covers/${safeSlug}-${Date.now()}-${token}.${extension}`;
};

const getPublishState = ({ draft, publishedAt }) => {
  if (draft) {
    return { label: "Draft", isScheduled: false, isPublic: false };
  }
  if (publishedAt) {
    const parsed = new Date(publishedAt);
    if (!Number.isNaN(parsed.valueOf()) && parsed > new Date()) {
      return { label: "Scheduled", isScheduled: true, isPublic: false };
    }
  }
  return { label: "Published", isScheduled: false, isPublic: true };
};

const getPostReadiness = (form) => {
  const title = form.querySelector("[name=\"title\"]").value.trim();
  const slug = form.querySelector("[name=\"slug\"]").value.trim();
  const content = form.querySelector("[name=\"content_md\"]").value.trim();
  const description = form.querySelector("[name=\"description\"]").value.trim();
  const tags = parseTags(form.querySelector("[name=\"tags\"]").value);
  const cover = form.querySelector("[name=\"cover_image\"]").value.trim();
  const draft = form.querySelector("[name=\"draft\"]").checked;
  const publishedInput = form.querySelector("[name=\"published_at\"]").value;
  const publishedAt = fromInputDateTime(publishedInput) || state.selected.posts?.published_at || null;
  const publishState = getPublishState({ draft, publishedAt });

  const required = [
    { label: "Title", ok: Boolean(title) },
    { label: "Slug", ok: Boolean(slug) },
    { label: "Content", ok: Boolean(content) },
  ];
  const recommended = [
    { label: "Description", ok: Boolean(description) },
    { label: "Tags", ok: tags.length > 0 },
    { label: "Cover image", ok: Boolean(cover) },
  ];
  const requiredOk = required.every((item) => item.ok);

  let status = publishState.label;
  if (!requiredOk) {
    status = "Missing required";
  } else if (publishState.isScheduled) {
    status = "Scheduled";
  } else if (publishState.isPublic) {
    status = "Ready";
  } else {
    status = "Draft";
  }

  return { required, recommended, requiredOk, status };
};

const renderReadiness = () => {
  const form = dom.forms.posts;
  if (!form || !dom.readinessList || !dom.readinessStatus) {
    return;
  }
  const readiness = getPostReadiness(form);
  dom.readinessStatus.textContent = readiness.status;
  dom.readinessList.innerHTML = "";

  const addItem = (label, ok, group) => {
    const row = document.createElement("div");
    row.className = `readiness-item${ok ? " is-ok" : " is-missing"}`;

    const name = document.createElement("span");
    name.className = "readiness-label";
    name.textContent = `${group}: ${label}`;

    const state = document.createElement("span");
    state.className = "readiness-state";
    state.textContent = ok ? "OK" : "Missing";

    row.appendChild(name);
    row.appendChild(state);
    dom.readinessList.appendChild(row);
  };

  readiness.required.forEach((item) => addItem(item.label, item.ok, "Required"));
  readiness.recommended.forEach((item) => addItem(item.label, item.ok, "Recommended"));
};

const getScheduledPosts = (posts) =>
  posts
    .filter((post) => {
      if (post.draft || !post.published_at) {
        return false;
      }
      const parsed = new Date(post.published_at);
      return !Number.isNaN(parsed.valueOf()) && parsed > new Date();
    })
    .sort((a, b) => new Date(a.published_at).valueOf() - new Date(b.published_at).valueOf());

const renderSchedulePanel = () => {
  if (!dom.scheduledQueue || !dom.scheduleReminder) {
    return;
  }
  dom.scheduledQueue.innerHTML = "";

  const scheduled = getScheduledPosts(state.items.posts);
  if (!scheduled.length) {
    dom.scheduleReminder.textContent = "No scheduled posts.";
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent = "Schedule a post to see upcoming publishes.";
    dom.scheduledQueue.appendChild(empty);
    return;
  }

  const next = scheduled[0];
  const relative = formatRelativeTime(next.published_at);
  const nextTime = formatDateTime(next.published_at);
  const count = scheduled.length;
  dom.scheduleReminder.textContent = `Next publish ${relative} (${nextTime}). ${count} scheduled.`;

  scheduled.slice(0, 5).forEach((post) => {
    const row = document.createElement("div");
    row.className = "schedule-item";

    const title = document.createElement("span");
    title.textContent = post.title || "Untitled";

    const time = document.createElement("span");
    time.className = "schedule-time";
    time.textContent = formatDateTime(post.published_at);

    row.appendChild(title);
    row.appendChild(time);
    dom.scheduledQueue.appendChild(row);
  });

  if (scheduled.length > 5) {
    const more = document.createElement("p");
    more.className = "list-empty";
    more.textContent = `And ${scheduled.length - 5} more scheduled posts.`;
    dom.scheduledQueue.appendChild(more);
  }
};

const updateSelectionUI = ({
  selectedIds,
  visibleIds,
  selectAll,
  selectedCount,
  actionButtons,
}) => {
  if (!selectedIds) {
    return;
  }
  const count = selectedIds.size;
  if (selectedCount) {
    selectedCount.textContent = `Selected ${count}`;
  }
  const disabled = count === 0;
  (actionButtons || []).forEach((button) => {
    if (button) {
      button.disabled = disabled;
    }
  });

  if (selectAll) {
    const visible = visibleIds || [];
    const selectedVisible = visible.filter((id) => selectedIds.has(id)).length;
    selectAll.checked = visible.length > 0 && selectedVisible === visible.length;
    selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
  }
};

const updatePostSelectionUI = () =>
  updateSelectionUI({
    selectedIds: state.selectedPostIds,
    visibleIds: state.visiblePostIds,
    selectAll: dom.postSelectAll,
    selectedCount: dom.selectedCount,
    actionButtons: [dom.bulkPublish, dom.bulkDraft, dom.bulkDelete, dom.bulkSchedule],
  });

const updateNewsSelectionUI = () =>
  updateSelectionUI({
    selectedIds: state.selectedNewsIds,
    visibleIds: state.visibleNewsIds,
    selectAll: dom.newsSelectAll,
    selectedCount: dom.newsSelectedCount,
    actionButtons: [dom.newsBulkPin, dom.newsBulkUnpin, dom.newsBulkDelete],
  });

const updateProjectsSelectionUI = () =>
  updateSelectionUI({
    selectedIds: state.selectedProjectIds,
    visibleIds: state.visibleProjectIds,
    selectAll: dom.projectsSelectAll,
    selectedCount: dom.projectsSelectedCount,
    actionButtons: [dom.projectsBulkDelete],
  });

const updateBulkScheduleState = () => {
  if (!dom.bulkSchedule || !dom.bulkScheduleTime) {
    return;
  }
  const hasSelection = state.selectedPostIds.size > 0;
  const value = dom.bulkScheduleTime.value;
  const parsed = fromInputDateTime(value);
  const isFuture = parsed ? new Date(parsed) > new Date() : false;
  dom.bulkSchedule.disabled = !(hasSelection && isFuture);
};

const validatePostForm = () => {
  const form = dom.forms.posts;
  if (!form) {
    return true;
  }
  const id = form.querySelector("[name=\"id\"]").value.trim();
  const title = form.querySelector("[name=\"title\"]").value.trim();
  const content = form.querySelector("[name=\"content_md\"]").value.trim();
  const draft = form.querySelector("[name=\"draft\"]").checked;
  const publishedInput = form.querySelector("[name=\"published_at\"]").value;
  const publishedAt = fromInputDateTime(publishedInput);
  const slugInput = form.querySelector("[name=\"slug\"]");
  const rawSlug = slugInput.value.trim();
  const normalizedSlug = rawSlug ? slugify(rawSlug) : "";

  let isValid = true;
  let postError = "";
  let slugError = "";

  if (!title || !content) {
    postError = "Title and content are required.";
    isValid = false;
  }

  if (!rawSlug && title) {
    slugError = "Slug is required.";
    isValid = false;
  } else if (rawSlug && normalizedSlug !== rawSlug) {
    slugError = "Use lowercase letters, numbers, and dashes.";
    isValid = false;
  } else if (
    normalizedSlug &&
    state.items.posts.some((post) => post.slug === normalizedSlug && post.id !== id)
  ) {
    slugError = "Slug already exists.";
    isValid = false;
  }

  const readiness = getPostReadiness(form);
  if (!readiness.requiredOk) {
    isValid = false;
  }

  setFieldMessage(dom.postError, postError);
  setFieldMessage(dom.slugError, slugError);

  if (dom.publishHint) {
    let hint = "";
    if (!draft && publishedAt) {
      const publishDate = new Date(publishedAt);
      if (!Number.isNaN(publishDate.valueOf()) && publishDate > new Date()) {
        hint = "Scheduled to publish at the selected time.";
      }
    } else if (!draft && !publishedAt) {
      hint = "Will publish immediately on save.";
    } else if (draft && publishedAt) {
      const draftDate = new Date(publishedAt);
      if (!Number.isNaN(draftDate.valueOf()) && draftDate > new Date()) {
        hint = "Drafts will not publish until draft is unchecked.";
      }
    }
    dom.publishHint.textContent = hint || "Set a future date with draft off to schedule.";
  }

  if (dom.savePost) {
    dom.savePost.disabled = !isValid;
  }
  if (dom.publishNow) {
    dom.publishNow.disabled = !isValid;
  }
  if (dom.setDraft) {
    dom.setDraft.disabled = !isValid;
  }

  renderReadiness();

  return isValid;
};

const updatePostSummary = (posts) => {
  if (!posts || !dom.postCounts) {
    return;
  }

  const summary = { drafts: 0, scheduled: 0, live: 0 };
  posts.forEach((post) => {
    const publishState = getPublishState({ draft: post.draft, publishedAt: post.published_at });
    if (post.draft) {
      summary.drafts += 1;
    } else if (publishState.isScheduled) {
      summary.scheduled += 1;
    } else {
      summary.live += 1;
    }
  });

  if (dom.postCounts.drafts) {
    dom.postCounts.drafts.textContent = `Drafts ${summary.drafts}`;
  }
  if (dom.postCounts.scheduled) {
    dom.postCounts.scheduled.textContent = `Scheduled ${summary.scheduled}`;
  }
  if (dom.postCounts.live) {
    dom.postCounts.live.textContent = `Live ${summary.live}`;
  }
};

const applyPostFilter = (posts) => {
  if (!Array.isArray(posts)) {
    return [];
  }
  if (state.postFilter === "all") {
    return posts;
  }
  return posts.filter((post) => {
    const publishState = getPublishState({ draft: post.draft, publishedAt: post.published_at });
    if (state.postFilter === "drafts") {
      return post.draft;
    }
    if (state.postFilter === "scheduled") {
      return publishState.isScheduled;
    }
    if (state.postFilter === "live") {
      return publishState.isPublic;
    }
    return true;
  });
};

const setPostFilter = (filter) => {
  state.postFilter = filter;
  dom.postFilters.forEach((button) => {
    const isActive = button.dataset.postFilter === filter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  renderPostsList();
};

const applyTopicFilter = (topics) => {
  if (!Array.isArray(topics)) {
    return [];
  }
  if (state.topicFilter === "all") {
    return topics;
  }
  return topics.filter((topic) => topic.status === state.topicFilter);
};

const setTopicFilter = (filter) => {
  state.topicFilter = filter;
  dom.topicFilters.forEach((button) => {
    const isActive = button.dataset.topicFilter === filter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  renderTopicsList();
};

const setActivityFilter = (type, value) => {
  if (type === "resource") {
    state.activityFilters.resource = value;
    dom.activityResourceFilters.forEach((button) => {
      const isActive = button.dataset.activityResource === value;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }
  if (type === "action") {
    state.activityFilters.action = value;
    dom.activityActionFilters.forEach((button) => {
      const isActive = button.dataset.activityAction === value;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }
  renderActivityList();
};

const isImageOnlyParagraph = (paragraph) => {
  if (!paragraph) {
    return false;
  }
  const images = paragraph.querySelectorAll("img");
  if (!images.length) {
    return false;
  }

  return !Array.from(paragraph.childNodes).some((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.trim().length > 0;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      return node.tagName.toLowerCase() !== "img";
    }
    return false;
  });
};

const enhanceMarkdown = (html) => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  const paragraphs = Array.from(wrapper.querySelectorAll("p"));
  let gallery = null;
  paragraphs.forEach((paragraph) => {
    if (!isImageOnlyParagraph(paragraph)) {
      gallery = null;
      return;
    }

    if (!gallery) {
      gallery = document.createElement("div");
      gallery.className = "markdown-gallery";
      paragraph.before(gallery);
    }

    paragraph.querySelectorAll("img").forEach((image) => {
      if (!image.getAttribute("loading")) {
        image.setAttribute("loading", "lazy");
      }
      if (!image.getAttribute("decoding")) {
        image.setAttribute("decoding", "async");
      }
      gallery.appendChild(image);
    });
    paragraph.remove();
  });

  return wrapper.innerHTML;
};

const renderMarkdown = (value) => enhanceMarkdown(marked.parse(value || ""));

const toInputDateTime = (value) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return "";
  }
  const offset = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 16);
};

const fromInputDateTime = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }
  return parsed.toISOString();
};

const parseTags = (value) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const isValidUrl = (value) => {
  try {
    const parsed = new URL(value);
    return /^https?:$/i.test(parsed.protocol);
  } catch (_error) {
    return false;
  }
};

const isJwtKey = (value) => typeof value === "string" && value.trim().startsWith("eyJ");

const getFunctionsKey = () => (isJwtKey(SUPABASE_ANON_KEY) ? SUPABASE_ANON_KEY : "");

const normalizeImportUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/\/$/, "")
    .toLowerCase();

const parseCsvLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((value) => value.trim());
};

const parseCsvData = (text) => {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (rows.length < 2) {
    return [];
  }
  const header = parseCsvLine(rows[0]).map((value) => value.toLowerCase());
  return rows.slice(1).map((row) => {
    const values = parseCsvLine(row);
    const entry = {};
    header.forEach((key, index) => {
      entry[key] = values[index] ?? "";
    });
    return entry;
  });
};

const normalizeNewsItem = (raw) => {
  const tagsRaw = raw.tags ?? raw.tag ?? "";
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((tag) => String(tag).trim()).filter(Boolean)
    : parseTags(String(tagsRaw));
  const published = raw.published_at || raw.publishedAt || "";
  const parsedDate = published ? new Date(published) : null;
  const publishedAt = parsedDate && !Number.isNaN(parsedDate.valueOf()) ? parsedDate.toISOString() : null;
  const pinnedValue = String(raw.pinned ?? "").toLowerCase();
  const pinned = pinnedValue === "true" || pinnedValue === "1" || pinnedValue === "yes";
  const readMinutes = Number.parseInt(raw.read_minutes ?? raw.readMinutes ?? "", 10);

  return {
    title: String(raw.title || "").trim(),
    source: String(raw.source || "").trim(),
    url: String(raw.url || "").trim(),
    summary: String(raw.summary || "").trim() || null,
    published_at: publishedAt,
    tags,
    read_minutes: Number.isNaN(readMinutes) ? null : readMinutes,
    pinned,
    category: String(raw.category || "").trim() || null,
  };
};

const parseNewsImportPayload = (text) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed.items)) {
      return parsed.items;
    }
    return [];
  }
  return parseCsvData(trimmed);
};

const readFileText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const formatTags = (tags) => (Array.isArray(tags) ? tags.join(", ") : "");

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const updateUserBadge = (session) => {
  if (!dom.userBadge) {
    return;
  }
  if (session?.user?.email) {
    dom.userBadge.textContent = session.user.email;
    setHidden(dom.userBadge, false);
  } else {
    dom.userBadge.textContent = "";
    setHidden(dom.userBadge, true);
  }
  setHidden(dom.signOut, !session);
};

const showAuth = () => {
  setHidden(dom.authSection, false);
  setHidden(dom.dashboardSection, true);
};

const showDashboard = () => {
  setHidden(dom.authSection, true);
  setHidden(dom.dashboardSection, false);
};

const checkAdmin = async () => {
  if (!supabase) {
    return false;
  }
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    setStatus("Admin check failed. Confirm the is_admin function exists.", "error");
    return false;
  }
  return Boolean(data);
};

const buildSelectableListItem = ({ id, title, meta, isActive, isSelected, selectLabel }) => {
  const row = document.createElement("div");
  row.className = `list-item list-row${isActive ? " is-active" : ""}${
    isSelected ? " is-selected" : ""
  }`;
  row.dataset.itemId = id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "list-check";
  checkbox.checked = Boolean(isSelected);
  checkbox.dataset.itemId = id;
  checkbox.setAttribute("aria-label", selectLabel || "Select item");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "list-body";
  button.dataset.itemSelect = "true";
  button.dataset.itemId = id;

  const titleEl = document.createElement("div");
  titleEl.className = "list-title";
  titleEl.textContent = title || "Untitled";

  const metaEl = document.createElement("div");
  metaEl.className = "list-meta";
  metaEl.textContent = meta;

  button.appendChild(titleEl);
  button.appendChild(metaEl);
  row.appendChild(checkbox);
  row.appendChild(button);
  return row;
};

const buildNewsListItem = (item, { isActive, isSelected }) => {
  const isSynced = Boolean(item?.ingest_source);
  const row = document.createElement("div");
  row.className = `list-item list-row${isActive ? " is-active" : ""}${
    isSelected ? " is-selected" : ""
  }${isSynced ? " list-item--synced" : ""}`;
  row.dataset.itemId = item.id;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "list-check";
  checkbox.checked = Boolean(isSelected);
  checkbox.dataset.itemId = item.id;
  checkbox.setAttribute("aria-label", `Select ${item.title || "news"}`);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "list-body";
  button.dataset.itemSelect = "true";
  button.dataset.itemId = item.id;

  const titleRow = document.createElement("div");
  titleRow.className = "list-title-row";

  const titleEl = document.createElement("span");
  titleEl.className = "list-title";
  titleEl.textContent = item.title || "Untitled";

  const pill = document.createElement("span");
  pill.className = isSynced
    ? "news-status-pill news-status-pill--synced"
    : "news-status-pill news-status-pill--manual";
  if (isSynced) {
    pill.textContent = `Synced · ${formatIngestFeedLabel(item.ingest_source)}`;
    pill.title = `Auto-ingested from ${item.ingest_source}`;
  } else {
    pill.textContent = "Manual";
  }

  titleRow.appendChild(titleEl);
  titleRow.appendChild(pill);

  const metaEl = document.createElement("div");
  metaEl.className = "list-meta";
  const actor = formatActor(item.updated_by || item.created_by);
  metaEl.textContent = joinMeta([
    item.source || null,
    formatDate(item.published_at),
    actor ? `by ${actor}` : null,
  ]);

  button.appendChild(titleRow);
  button.appendChild(metaEl);
  row.appendChild(checkbox);
  row.appendChild(button);
  return row;
};

const updateNewsCounts = () => {
  const el = dom.newsCounts;
  if (!el) {
    return;
  }
  const manual = state.items.news.filter((item) => !item.ingest_source).length;
  const synced = state.items.news.filter((item) => item.ingest_source).length;
  const pills = [
    `<span class="summary-pill">Manual ${manual}</span>`,
    `<span class="summary-pill">Synced ${synced}</span>`,
  ];
  if (state.newsFilter === "auto" && state.newsIngestSourceFilter) {
    const filtered = getFilteredNews().length;
    pills.push(
      `<span class="summary-pill">${escapeHtml(formatIngestFeedLabel(state.newsIngestSourceFilter))} ${filtered}</span>`
    );
  }
  el.innerHTML = pills.join("");
};

const formatFeedStatusBadge = (feed) => {
  if (state.newsSyncInFlight && state.newsSyncActiveSlug === feed.slug) {
    return '<span class="feed-badge feed-badge--syncing">Syncing…</span>';
  }
  if (!feed.last_run_at) {
    return '<span class="feed-badge feed-badge--idle">Never run</span>';
  }
  if (feed.last_status === "error") {
    const title = escapeHtml(feed.last_error || "Sync failed");
    const detail = feed.last_run_at ? formatDate(feed.last_run_at) : "";
    return `<span class="feed-badge feed-badge--error" title="${title}">Error</span>${
      detail ? `<div class="feed-status-detail">${escapeHtml(detail)}</div>` : ""
    }`;
  }
  if (feed.last_status === "ok") {
    const detail = joinMeta([
      formatDate(feed.last_run_at),
      typeof feed.last_inserted === "number" ? `+${feed.last_inserted} new` : null,
    ]);
    return `<span class="feed-badge feed-badge--ok" title="${escapeHtml(detail)}">OK</span>${
      detail ? `<div class="feed-status-detail">${escapeHtml(detail)}</div>` : ""
    }`;
  }
  return `<span class="feed-badge feed-badge--idle">${escapeHtml(feed.last_status || "Unknown")}</span>`;
};

const setNewsSyncUiState = (inFlight, activeSlug = null) => {
  state.newsSyncInFlight = Boolean(inFlight);
  state.newsSyncActiveSlug = activeSlug || null;
  dom.newsFeedsPanel?.classList.toggle("is-syncing", state.newsSyncInFlight);
  if (dom.newsSyncAll) {
    dom.newsSyncAll.disabled = state.newsSyncInFlight;
  }
  if (dom.newsFeedsRefresh) {
    dom.newsFeedsRefresh.disabled = state.newsSyncInFlight;
  }
  if (state.newsSyncInFlight) {
    setNewsSyncStatus("Syncing…", "pending");
    renderFeedsTable();
    return;
  }
  renderFeedsTable();
};

const updateNewsIngestNote = (item) => {
  const note = dom.newsIngestNote;
  if (!note) {
    return;
  }
  const slug = item?.ingest_source;
  if (!slug) {
    note.classList.add("hidden");
    return;
  }
  note.classList.remove("hidden");
  if (dom.newsIngestPill) {
    dom.newsIngestPill.textContent = `Synced · ${formatIngestFeedLabel(slug)}`;
    dom.newsIngestPill.title = `Auto-ingested from ${slug}`;
  }
};

const renderPostsList = () => {
  const list = dom.lists.posts;
  if (!list) {
    return;
  }
  list.innerHTML = "";
  updatePostSummary(state.items.posts);
  const visiblePosts = applyPostFilter(state.items.posts);
  state.visiblePostIds = visiblePosts.map((post) => post.id);
  if (!visiblePosts.length) {
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent =
      state.items.posts.length && state.postFilter !== "all"
        ? "No posts in this view."
        : "No posts yet.";
    list.appendChild(empty);
    renderSchedulePanel();
      updatePostSelectionUI();
    updateBulkScheduleState();
    return;
  }

  visiblePosts.forEach((post) => {
    const actor = formatActor(post.updated_by || post.created_by);
    const publishState = getPublishState({ draft: post.draft, publishedAt: post.published_at });
    const dateLabel = publishState.isScheduled
      ? `Publishes ${formatDate(post.published_at)}`
      : formatDate(post.updated_at || post.published_at);
    const meta = joinMeta([publishState.label, dateLabel, actor ? `by ${actor}` : null]);
    const item = buildSelectableListItem({
      id: post.id,
      title: post.title,
      meta,
      isActive: state.selected.posts?.id === post.id,
      isSelected: state.selectedPostIds.has(post.id),
      selectLabel: `Select ${post.title || "post"}`,
    });
    list.appendChild(item);
  });
  renderSchedulePanel();
  updatePostSelectionUI();
  updateBulkScheduleState();
};

const getFilteredNews = () => {
  let items = state.items.news;
  if (state.newsFilter === "manual") {
    return items.filter((item) => !item.ingest_source);
  }
  if (state.newsFilter === "auto") {
    items = items.filter((item) => item.ingest_source);
    if (state.newsIngestSourceFilter) {
      items = items.filter((item) => item.ingest_source === state.newsIngestSourceFilter);
    }
    return items;
  }
  return items;
};

const inferSyncStatusTone = (message) => {
  const text = String(message || "").toLowerCase();
  if (!text) {
    return "info";
  }
  if (text.includes("syncing")) {
    return "pending";
  }
  if (text.includes("fail") || text.includes("error") || text.includes("missing")) {
    return "error";
  }
  if (text.startsWith("done") || text.includes("finished")) {
    return "success";
  }
  return "info";
};

const setNewsSyncStatus = (message, tone = null) => {
  const resolvedTone = tone || inferSyncStatusTone(message);
  if (dom.newsSyncStatus) {
    dom.newsSyncStatus.textContent = message || "";
    dom.newsSyncStatus.dataset.tone = resolvedTone;
  }
};

const updateNewsFilterUI = () => {
  dom.newsFilters.forEach((button) => {
    const value = button.dataset.newsFilter || "all";
    const isActive = value === state.newsFilter;
    button.setAttribute("aria-pressed", String(isActive));
    button.classList.toggle("active", isActive);
    button.classList.toggle("filter-chip--manual", value === "manual");
    button.classList.toggle("filter-chip--auto", value === "auto");
    button.classList.toggle("filter-chip--all", value === "all");
  });
  const showSourceFilter = state.newsFilter === "auto";
  if (dom.newsIngestSourceFilter) {
    dom.newsIngestSourceFilter.hidden = !showSourceFilter;
  }
};

const updateNewsFeedSelectOptions = () => {
  const slugs = new Set();
  state.feedSources.forEach((feed) => slugs.add(feed.slug));
  state.items.news.forEach((item) => {
    if (item.ingest_source) {
      slugs.add(item.ingest_source);
    }
  });
  const sorted = [...slugs].sort();

  const fillSelect = (select, placeholder) => {
    if (!select) {
      return;
    }
    const current = select.value;
    select.innerHTML = "";
    const base = document.createElement("option");
    base.value = "";
    base.textContent = placeholder;
    select.appendChild(base);
    sorted.forEach((slug) => {
      const option = document.createElement("option");
      option.value = slug;
      option.textContent = slug;
      select.appendChild(option);
    });
    if (sorted.includes(current)) {
      select.value = current;
    }
  };

  fillSelect(dom.newsIngestSourceFilter, "All feeds");
  fillSelect(dom.newsAutoDeleteSource, "Delete auto by feed…");
};

const setNewsFilter = (filter) => {
  state.newsFilter = filter || "all";
  if (state.newsFilter !== "auto") {
    state.newsIngestSourceFilter = "";
    if (dom.newsIngestSourceFilter) {
      dom.newsIngestSourceFilter.value = "";
    }
  }
  updateNewsFilterUI();
  renderNewsList();
  updateNewsCounts();
  const label = NEWS_FILTER_LABELS[state.newsFilter] || state.newsFilter;
  const manual = state.items.news.filter((item) => !item.ingest_source).length;
  const synced = state.items.news.filter((item) => item.ingest_source).length;
  const visible = getFilteredNews().length;
  replayNews(
    "filter",
    `View: ${label} · ${visible} shown (${manual} manual, ${synced} synced)`,
    "info",
    { filter: state.newsFilter, visible, manual, synced }
  );
};

const renderFeedsTable = () => {
  const wrap = dom.newsFeedsTable;
  if (!wrap) {
    return;
  }

  if (!state.feedSources.length) {
    wrap.innerHTML =
      '<p class="muted">No feed sources found. Run the news auto-ingest SQL block in Supabase.</p>';
    return;
  }

  const syncDisabled = !hasSyncSecret || state.newsSyncInFlight;
  const rows = state.feedSources
    .map((feed) => {
      const statusBadge = formatFeedStatusBadge(feed);
      return `<tr>
        <td><code>${escapeHtml(feed.slug)}</code></td>
        <td>${escapeHtml(feed.name)}</td>
        <td>${escapeHtml(feed.kind)}</td>
        <td>
          <label class="sr-only" for="feed-enabled-${escapeHtml(feed.slug)}">Enabled ${escapeHtml(feed.slug)}</label>
          <input type="checkbox" id="feed-enabled-${escapeHtml(feed.slug)}" data-feed-enabled="${escapeHtml(feed.slug)}" ${feed.enabled ? "checked" : ""} ${state.newsSyncInFlight ? "disabled" : ""} />
        </td>
        <td>
          <input type="number" class="feeds-limit-input" min="1" max="100" value="${Number(feed.fetch_limit) || 20}" data-feed-limit="${escapeHtml(feed.slug)}" ${state.newsSyncInFlight ? "disabled" : ""} />
        </td>
        <td>${statusBadge}</td>
        <td>
          <button class="button ghost" type="button" data-feed-sync="${escapeHtml(feed.slug)}" ${syncDisabled ? "disabled" : ""}>Sync</button>
        </td>
      </tr>`;
    })
    .join("");

  wrap.innerHTML = `<table class="feeds-table">
    <thead>
      <tr>
        <th>Slug</th>
        <th>Name</th>
        <th>Kind</th>
        <th>On</th>
        <th>Limit</th>
        <th>Last run</th>
        <th></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;

  if (!hasSyncSecret) {
    setNewsSyncStatus("Add NEWS_SYNC_SECRET to admin/config.js");
  }
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const renderIngestLog = () => {
  const list = dom.newsIngestLog;
  if (!list) {
    return;
  }
  list.innerHTML = "";
  if (!state.ingestLogs.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No ingest runs yet.";
    list.appendChild(empty);
    return;
  }

  state.ingestLogs.forEach((entry) => {
    const row = document.createElement("div");
    const errors = Array.isArray(entry.errors) ? entry.errors : [];
    row.className = `ingest-log-item${errors.length ? " has-errors" : ""}`;
    row.textContent = joinMeta([
      entry.source_slug,
      formatDate(entry.run_at),
      `fetched ${entry.fetched}`,
      `+${entry.inserted}`,
      `skip ${entry.skipped}`,
      errors.length ? `${errors.length} err` : null,
    ]);
    if (errors.length) {
      const detail = document.createElement("pre");
      detail.className = "import-sample";
      detail.textContent = JSON.stringify(errors.slice(0, 3), null, 2);
      row.appendChild(detail);
    }
    list.appendChild(row);
  });
};

const loadFeedSources = async () => {
  if (!supabase) {
    return;
  }
  const { data, error } = await supabase
    .from("news_feed_sources")
    .select("*")
    .order("slug", { ascending: true });

  if (error) {
    setStatus(`Feeds failed to load: ${error.message}`, "error");
    return;
  }
  state.feedSources = data || [];
  renderFeedsTable();
  updateNewsFeedSelectOptions();
};

const loadIngestLog = async () => {
  if (!supabase) {
    return;
  }
  const { data, error } = await supabase
    .from("news_ingest_log")
    .select("*")
    .order("run_at", { ascending: false })
    .limit(10);

  if (error) {
    setStatus(`Ingest log failed to load: ${error.message}`, "error");
    return;
  }
  state.ingestLogs = data || [];
  renderIngestLog();
};

const triggerNewsSync = async (sources = null) => {
  if (!hasSyncSecret) {
    setNewsSyncStatus("Missing NEWS_SYNC_SECRET in config", "error");
    replayNews("sync", "Add NEWS_SYNC_SECRET to admin/config.js.", "error");
    return;
  }

  if (state.newsSyncInFlight) {
    return;
  }

  const activeSlug =
    Array.isArray(sources) && sources.length === 1 ? sources[0] : null;
  const syncLabel = activeSlug ? `Sync ${activeSlug}` : "Sync all enabled feeds";
  setNewsSyncUiState(true, activeSlug);
  replayNews("sync", `Started: ${syncLabel}`, "info", { sources: sources || "all" });

  try {
    const body = Array.isArray(sources) && sources.length ? { sources } : {};
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${NEWS_SYNC_FUNCTION}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "x-sync-secret": NEWS_SYNC_SECRET,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload?.error || `Sync failed (${response.status})`;
      setNewsSyncStatus(message, "error");
      replayNews("sync", `Failed: ${message}`, "error", { sources: sources || "all" });
      return;
    }

    await Promise.all([loadFeedSources(), loadIngestLog(), loadNews()]);
    const inserted = (payload?.results || []).reduce(
      (sum, row) => sum + (Number(row?.inserted) || 0),
      0
    );
    setNewsSyncStatus(`Done · +${inserted} new`, "success");
    replayNews(
      "sync",
      `Finished: ${syncLabel} · +${inserted} new`,
      "success",
      { inserted, results: payload?.results }
    );
  } finally {
    setNewsSyncUiState(false, null);
  }
};

const updateFeedEnabled = async (slug, enabled) => {
  if (!supabase || !slug) {
    return;
  }
  const { error } = await supabase
    .from("news_feed_sources")
    .update({ enabled })
    .eq("slug", slug);
  if (error) {
    replayNews("feed", `Feed ${slug}: update failed — ${error.message}`, "error");
    await loadFeedSources();
    return;
  }
  await loadFeedSources();
  replayNews("feed", `${slug} ${enabled ? "enabled" : "disabled"}`, "success");
};

const updateFeedLimit = async (slug, rawLimit) => {
  if (!supabase || !slug) {
    return;
  }
  const fetchLimit = Math.min(100, Math.max(1, Number(rawLimit) || 20));
  const { error } = await supabase
    .from("news_feed_sources")
    .update({ fetch_limit: fetchLimit })
    .eq("slug", slug);
  if (error) {
    replayNews("feed", `Feed ${slug}: limit update failed — ${error.message}`, "error");
    return;
  }
  await loadFeedSources();
  replayNews("feed", `${slug} fetch limit → ${fetchLimit}`, "success");
};

const handleDeleteAutoIngested = async () => {
  const slug = dom.newsAutoDeleteSource?.value?.trim();
  if (!slug || !supabase) {
    replayNews("delete-auto", "Choose a feed slug to delete auto-ingested links.", "error");
    return;
  }
  const count = state.items.news.filter((item) => item.ingest_source === slug).length;
  if (!count) {
    replayNews("delete-auto", `No auto-ingested items for ${slug}.`, "info");
    return;
  }
  const confirmed = window.confirm(
    `Delete ${count} auto-ingested news link(s) from "${slug}"? Manual entries are kept.`
  );
  if (!confirmed) {
    replayNews("delete-auto", `Cancelled delete for ${slug}.`, "info");
    return;
  }
  replayNews("delete-auto", `Deleting ${count} auto-ingested link(s) from ${slug}…`, "info");
  const { error } = await supabase.from("news").delete().eq("ingest_source", slug);
  if (error) {
    replayNews("delete-auto", `Delete failed: ${error.message}`, "error");
    return;
  }
  await loadNews();
  replayNews("delete-auto", `Deleted ${count} auto-ingested item(s) for ${slug}.`, "success");
};

const renderNewsList = () => {
  const list = dom.lists.news;
  if (!list) {
    return;
  }
  list.innerHTML = "";
  const visibleNews = getFilteredNews();
  state.visibleNewsIds = visibleNews.map((item) => item.id);
  if (!visibleNews.length) {
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent =
      state.newsFilter === "all" ? "No news links yet." : "No news links match this filter.";
    list.appendChild(empty);
    updateNewsSelectionUI();
    return;
  }

  visibleNews.forEach((item) => {
    const row = buildNewsListItem(item, {
      isActive: state.selected.news?.id === item.id,
      isSelected: state.selectedNewsIds.has(item.id),
    });
    list.appendChild(row);
  });
  updateNewsSelectionUI();
  updateNewsCounts();
};

const renderProjectsList = () => {
  const list = dom.lists.projects;
  if (!list) {
    return;
  }
  list.innerHTML = "";
  const visibleProjects = state.items.projects;
  state.visibleProjectIds = visibleProjects.map((project) => project.id);
  if (!visibleProjects.length) {
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent = "No projects yet.";
    list.appendChild(empty);
    updateProjectsSelectionUI();
    return;
  }

  visibleProjects.forEach((project) => {
    const actor = formatActor(project.updated_by || project.created_by);
    const meta = joinMeta([
      project.language || null,
      formatDate(project.updated_at),
      actor ? `by ${actor}` : null,
    ]);
    const row = buildSelectableListItem({
      id: project.id,
      title: project.title,
      meta,
      isActive: state.selected.projects?.id === project.id,
      isSelected: state.selectedProjectIds.has(project.id),
      selectLabel: `Select ${project.title || "project"}`,
    });
    list.appendChild(row);
  });
  updateProjectsSelectionUI();
};

const renderTopicsList = () => {
  const list = dom.lists.topics;
  if (!list) {
    return;
  }
  list.innerHTML = "";
  const visibleTopics = applyTopicFilter(state.items.topics);
  state.visibleTopicIds = visibleTopics.map((topic) => topic.id);
  if (!visibleTopics.length) {
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent = "No topics yet.";
    list.appendChild(empty);
    return;
  }

  visibleTopics.forEach((topic) => {
    const statusLabel = topic.status === "archived" ? "Archived" : "Open";
    const flags = [
      topic.is_locked ? "Locked" : null,
      topic.is_unlisted ? "Unlisted" : null,
      topic.voice_enabled ? "Voice" : null,
    ].filter(Boolean);
    const meta = joinMeta([
      statusLabel,
      flags.length ? flags.join(", ") : null,
      formatDateTime(topic.last_activity_at || topic.created_at),
    ]);
    const row = buildSelectableListItem({
      id: topic.id,
      title: topic.title,
      meta,
      isActive: state.selected.topics?.id === topic.id,
      isSelected: state.selectedTopicIds.has(topic.id),
      selectLabel: `Select ${topic.title || "topic"}`,
    });
    list.appendChild(row);
  });
};

const renderTopicComments = () => {
  const list = dom.lists.topicComments;
  if (!list) {
    return;
  }
  list.innerHTML = "";
  const comments = state.items.topicComments;
  if (!comments.length) {
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent = "No replies yet.";
    list.appendChild(empty);
    return;
  }

  comments.forEach((comment) => {
    const row = document.createElement("div");
    row.className = "comment-item";

    const meta = document.createElement("div");
    meta.className = "comment-meta";
    const status = comment.is_hidden ? "Hidden" : "Visible";
    meta.textContent = joinMeta([
      comment.author_name || "Anon",
      formatDateTime(comment.created_at),
      status,
    ]);

    const body = document.createElement("div");
    body.className = "comment-body";
    body.textContent = comment.body || "";

    const actions = document.createElement("div");
    actions.className = "comment-actions";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "button ghost";
    toggle.textContent = comment.is_hidden ? "Unhide" : "Hide";
    toggle.addEventListener("click", () => {
      toggleTopicComment(comment.id, !comment.is_hidden);
    });

    actions.appendChild(toggle);
    row.appendChild(meta);
    row.appendChild(body);
    row.appendChild(actions);
    list.appendChild(row);
  });
};

const getActivityLabel = (entry) => {
  const resourceMap = {
    posts: "post",
    news: "news",
    projects: "project",
  };
  const actionMap = {
    insert: "Created",
    update: "Updated",
    delete: "Deleted",
  };
  const resource = resourceMap[entry.resource] || entry.resource || "item";
  const action = actionMap[entry.action] || entry.action || "Updated";
  const title = entry.title || entry.slug || entry.record_id || "Untitled";
  return `${action} ${resource}: ${title}`;
};

const applyActivityFilters = (items) =>
  items.filter((entry) => {
    if (state.activityFilters.resource !== "all" && entry.resource !== state.activityFilters.resource) {
      return false;
    }
    if (state.activityFilters.action !== "all" && entry.action !== state.activityFilters.action) {
      return false;
    }
    return true;
  });

const renderActivityList = () => {
  const list = dom.lists.activity;
  if (!list) {
    return;
  }
  list.innerHTML = "";
  const visibleActivity = applyActivityFilters(state.items.activity);
  if (!visibleActivity.length) {
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent = state.items.activity.length ? "No activity matches filters." : "No activity yet.";
    list.appendChild(empty);
    return;
  }

  visibleActivity.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "activity-item";

    const title = document.createElement("div");
    title.className = "activity-title";
    title.textContent = getActivityLabel(entry);

    const actor = formatActor(entry.actor_id);
    const meta = document.createElement("div");
    meta.className = "activity-meta";
    meta.textContent = joinMeta([
      formatDateTime(entry.created_at),
      actor ? `by ${actor}` : null,
    ]);

    row.appendChild(title);
    row.appendChild(meta);
    list.appendChild(row);
  });
};

const renderSearchAiQueries = () => {
  const list = dom.lists.searchAiQueries;
  if (!list) {
    return;
  }
  list.innerHTML = "";

  if (!state.items.searchAiQueries.length) {
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent = "No AI queries yet.";
    list.appendChild(empty);
    return;
  }

  const buildQueryCell = (label, value, { isQuestion = false } = {}) => {
    const cell = document.createElement("div");
    cell.className = "query-grid-cell";
    if (isQuestion) {
      cell.classList.add("is-question");
    }

    const key = document.createElement("span");
    key.className = "query-grid-label";
    key.textContent = label;

    const val = document.createElement("span");
    val.className = "query-grid-value";
    val.textContent = value;

    cell.appendChild(key);
    cell.appendChild(val);
    return cell;
  };

  state.items.searchAiQueries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "activity-item query-grid";

    const question = entry.question || "Untitled question";
    const askedAt = entry.created_at ? formatDateTime(entry.created_at) : "Unknown";
    const ip = entry.ip || "Unknown";
    const userAgent = entry.user_agent || "Unknown";

    row.appendChild(buildQueryCell("Question", question, { isQuestion: true }));
    row.appendChild(buildQueryCell("Asked", askedAt));
    row.appendChild(buildQueryCell("IP", ip));
    row.appendChild(buildQueryCell("User agent", userAgent));
    list.appendChild(row);
  });
};

const renderVisitorLogs = () => {
  const list = dom.lists.visitorLogs;
  if (!list) {
    return;
  }
  list.innerHTML = "";

  if (!state.items.visitorLogs.length) {
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent = "No visits logged yet.";
    list.appendChild(empty);
    return;
  }

  const buildCell = (label, value) => {
    const cell = document.createElement("div");
    cell.className = "query-grid-cell";

    const key = document.createElement("span");
    key.className = "query-grid-label";
    key.textContent = label;

    const val = document.createElement("span");
    val.className = "query-grid-value";
    val.textContent = value || "Unknown";

    cell.appendChild(key);
    cell.appendChild(val);
    return cell;
  };

  state.items.visitorLogs.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "activity-item query-grid visitor-grid";

    row.appendChild(buildCell("Path", entry.path || "/"));
    row.appendChild(buildCell("IP", entry.ip || "Unknown"));
    row.appendChild(buildCell("Visited", formatDateTime(entry.created_at)));
    row.appendChild(buildCell("User agent", entry.user_agent || "Unknown"));

    list.appendChild(row);
  });
};

const loadPosts = async () => {
  if (!supabase) {
    return;
  }
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    setStatus(`Posts failed to load: ${error.message}`, "error");
    return;
  }
  state.items.posts = data || [];
  syncSelectedPosts();
  renderPostsList();
  refreshSelectedPost();
  validatePostForm();
};

const loadNews = async () => {
  if (!supabase) {
    return;
  }
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    setStatus(`News failed to load: ${error.message}`, "error");
    return;
  }
  state.items.news = data || [];
  syncSelectedNews();
  updateNewsFeedSelectOptions();
  renderNewsList();
  updateNewsCounts();
  refreshSelectedNews();
};

const loadProjects = async () => {
  if (!supabase) {
    return;
  }
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    setStatus(`Projects failed to load: ${error.message}`, "error");
    return;
  }
  state.items.projects = data || [];
  syncSelectedProjects();
  renderProjectsList();
  refreshSelectedProjects();
};

const loadTopics = async () => {
  if (!supabase) {
    return;
  }
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("last_activity_at", { ascending: false });

  if (error) {
    setStatus(`Topics failed to load: ${error.message}`, "error");
    return;
  }
  state.items.topics = data || [];
  renderTopicsList();
  refreshSelectedTopic();
};

const loadTopicComments = async (topicId) => {
  if (!supabase || !topicId) {
    return;
  }
  const { data, error } = await supabase
    .from("topic_comments")
    .select("*")
    .eq("topic_id", topicId)
    .order("created_at", { ascending: true });

  if (error) {
    setStatus(`Comments failed to load: ${error.message}`, "error");
    return;
  }
  state.items.topicComments = data || [];
  renderTopicComments();
};

const loadActivity = async () => {
  if (!supabase) {
    return;
  }
  const { data, error } = await supabase
    .from("content_activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    setStatus(`Activity failed to load: ${error.message}`, "error");
    return;
  }
  state.items.activity = data || [];
  renderActivityList();
};

const loadSearchAiQueries = async () => {
  if (!supabase) {
    return;
  }
  const { data, error } = await supabase
    .from("search_ai_queries")
    .select("question, ip, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    setStatus(`AI query log failed to load: ${error.message}`, "error");
    return;
  }

  state.items.searchAiQueries = data || [];
  renderSearchAiQueries();
};

const loadVisitorLogs = async () => {
  if (!supabase) {
    return;
  }
  const { data, error } = await supabase
    .from("visitor_logs")
    .select("path, referrer, ip, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    setStatus(`Visitor log failed to load: ${error.message}`, "error");
    return;
  }

  state.items.visitorLogs = data || [];
  renderVisitorLogs();
};

const syncSelectedSet = (selectedSet, items) => {
  const validIds = new Set(items.map((item) => item.id));
  selectedSet.forEach((id) => {
    if (!validIds.has(id)) {
      selectedSet.delete(id);
    }
  });
};

const syncSelectedPosts = () => syncSelectedSet(state.selectedPostIds, state.items.posts);

const syncSelectedNews = () => syncSelectedSet(state.selectedNewsIds, state.items.news);

const syncSelectedProjects = () => syncSelectedSet(state.selectedProjectIds, state.items.projects);

const clearPostSelection = () => {
  state.selectedPostIds.clear();
  updatePostSelectionUI();
  renderPostsList();
};

const clearNewsSelection = () => {
  state.selectedNewsIds.clear();
  updateNewsSelectionUI();
  renderNewsList();
};

const clearProjectsSelection = () => {
  state.selectedProjectIds.clear();
  updateProjectsSelectionUI();
  renderProjectsList();
};

const refreshSelectedPost = () => {
  if (!state.selected.posts) {
    return;
  }
  const updated = state.items.posts.find((post) => post.id === state.selected.posts.id);
  if (updated) {
    state.selected.posts = updated;
    fillPostForm(updated);
  } else {
    resetPostForm();
  }
};

const refreshSelectedNews = () => {
  if (!state.selected.news) {
    return;
  }
  const updated = state.items.news.find((item) => item.id === state.selected.news.id);
  if (updated) {
    state.selected.news = updated;
    fillNewsForm(updated);
  } else {
    resetNewsForm();
  }
};

const refreshSelectedProjects = () => {
  if (!state.selected.projects) {
    return;
  }
  const updated = state.items.projects.find((item) => item.id === state.selected.projects.id);
  if (updated) {
    state.selected.projects = updated;
    fillProjectsForm(updated);
  } else {
    resetProjectsForm();
  }
};

const refreshSelectedTopic = () => {
  if (!state.selected.topics) {
    return;
  }
  const updated = state.items.topics.find((topic) => topic.id === state.selected.topics.id);
  if (updated) {
    state.selected.topics = updated;
    fillTopicForm(updated);
  } else {
    resetTopicForm();
  }
};

const uploadCoverImage = async (file) => {
  if (!supabase || !dom.forms.posts) {
    return null;
  }

  const form = dom.forms.posts;
  const titleValue = form.querySelector("[name=\"title\"]").value.trim();
  const slugInput = form.querySelector("[name=\"slug\"]");
  let slug = slugify(slugInput.value.trim() || slugify(titleValue));
  if (!slug) {
    slug = "post";
  }
  if (!slugInput.value.trim()) {
    slugInput.value = slug;
  }

  setCoverStatus("Uploading cover image...");
  setStatus("Uploading cover image...", "info");

  const path = buildCoverPath(slug, file.name);
  const contentType = file.type || "image/jpeg";
  const { error } = await supabase.storage
    .from("post-covers")
    .upload(path, file, { upsert: true, contentType });

  if (error) {
    setCoverStatus(`Upload failed: ${error.message}`);
    setStatus("Cover upload failed.", "error");
    return null;
  }

  const { data } = supabase.storage.from("post-covers").getPublicUrl(path);
  const publicUrl = data?.publicUrl;
  if (!publicUrl) {
    setCoverStatus("Upload failed: public URL unavailable.");
    setStatus("Cover upload failed.", "error");
    return null;
  }

  form.querySelector("[name=\"cover_image\"]").value = publicUrl;
  setCoverStatus("Upload complete.");
  setStatus("Cover image uploaded.", "success");
  updatePostPreview();
  return publicUrl;
};

const createPreviewToken = async () => {
  if (!supabase) {
    return;
  }
  const selected = state.selected.posts;
  if (!selected?.id) {
    setStatus("Save the post before generating a preview link.", "error");
    return;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + PREVIEW_TOKEN_DAYS * 86400000).toISOString();
  const { error } = await supabase.from("preview_tokens").insert({
    token,
    post_id: selected.id,
    expires_at: expiresAt,
    created_by: state.session?.user?.id || null,
  });

  if (error) {
    setStatus(`Preview link failed: ${error.message}`, "error");
    return;
  }

  state.previewTokens.set(selected.id, { token, expiresAt });
  setStatus("Preview link generated.", "success");
  updatePostPreview();
};

const cleanupPreviewTokens = async () => {
  if (!supabase) {
    return { count: 0, error: null };
  }
  const { data, error } = await supabase.rpc("cleanup_preview_tokens");
  if (error) {
    return { count: 0, error };
  }
  return { count: Number(data) || 0, error: null };
};

const resetPostForm = () => {
  const form = dom.forms.posts;
  if (!form) {
    return;
  }
  const previousId = state.selected.posts?.id;
  form.reset();
  form.querySelector("[name=\"id\"]").value = "";
  state.selected.posts = null;
  state.slugTouched = false;
  if (previousId) {
    state.previewTokens.delete(previousId);
  }
  if (dom.coverFile) {
    dom.coverFile.value = "";
  }
  setCoverStatus("");
  updatePostPreview();
  validatePostForm();
  renderPostsList();
};

const resetNewsForm = () => {
  const form = dom.forms.news;
  if (!form) {
    return;
  }
  form.reset();
  form.querySelector("[name=\"id\"]").value = "";
  state.selected.news = null;
  lastNewsAutofillUrl = "";
  setNewsAutofillStatus("");
  updateNewsIngestNote(null);
  renderNewsList();
};

const resetProjectsForm = () => {
  const form = dom.forms.projects;
  if (!form) {
    return;
  }
  form.reset();
  form.querySelector("[name=\"id\"]").value = "";
  state.selected.projects = null;
  if (dom.projectUpdated) {
    dom.projectUpdated.textContent = "";
  }
  renderProjectsList();
};

const resetTopicForm = () => {
  const form = dom.forms.topics;
  if (!form) {
    return;
  }
  form.reset();
  form.querySelector("[name=\"id\"]").value = "";
  state.selected.topics = null;
  state.selectedTopicIds.clear();
  state.items.topicComments = [];
  renderTopicsList();
  renderTopicComments();
};

const fillPostForm = (post) => {
  const form = dom.forms.posts;
  if (!form) {
    return;
  }
  form.querySelector("[name=\"id\"]").value = post?.id || "";
  form.querySelector("[name=\"title\"]").value = post?.title || "";
  form.querySelector("[name=\"slug\"]").value = post?.slug || "";
  form.querySelector("[name=\"description\"]").value = post?.description || "";
  form.querySelector("[name=\"content_md\"]").value = post?.content_md || "";
  form.querySelector("[name=\"tags\"]").value = formatTags(post?.tags);
  form.querySelector("[name=\"draft\"]").checked = Boolean(post?.draft);
  form.querySelector("[name=\"featured\"]").checked = Boolean(post?.featured);
  form.querySelector("[name=\"published_at\"]").value = toInputDateTime(post?.published_at);
  form.querySelector("[name=\"cover_image\"]").value = post?.cover_image || "";
  form.querySelector("[name=\"cover_image_alt\"]").value = post?.cover_image_alt || "";
  state.slugTouched = true;
  if (dom.coverFile) {
    dom.coverFile.value = "";
  }
  setCoverStatus("");
  updatePostPreview();
  validatePostForm();
  renderPostsList();
};

const fillNewsForm = (item) => {
  const form = dom.forms.news;
  if (!form) {
    return;
  }
  form.querySelector("[name=\"id\"]").value = item?.id || "";
  form.querySelector("[name=\"title\"]").value = item?.title || "";
  form.querySelector("[name=\"source\"]").value = item?.source || "";
  form.querySelector("[name=\"url\"]").value = item?.url || "";
  form.querySelector("[name=\"summary\"]").value = item?.summary || "";
  form.querySelector("[name=\"published_at\"]").value = toInputDateTime(item?.published_at);
  form.querySelector("[name=\"tags\"]").value = formatTags(item?.tags);
  form.querySelector("[name=\"read_minutes\"]").value = item?.read_minutes ?? "";
  form.querySelector("[name=\"pinned\"]").checked = Boolean(item?.pinned);
  form.querySelector("[name=\"featured\"]").checked = Boolean(item?.featured);
  form.querySelector("[name=\"category\"]").value = item?.category || "";
  lastNewsAutofillUrl = normalizeImportUrl(item?.url || "");
  setNewsAutofillStatus("");
  updateNewsIngestNote(item);
  renderNewsList();
};

const fillProjectsForm = (item) => {
  const form = dom.forms.projects;
  if (!form) {
    return;
  }
  form.querySelector("[name=\"id\"]").value = item?.id || "";
  form.querySelector("[name=\"title\"]").value = item?.title || "";
  form.querySelector("[name=\"description\"]").value = item?.description || "";
  form.querySelector("[name=\"url\"]").value = item?.url || "";
  form.querySelector("[name=\"tags\"]").value = formatTags(item?.tags);
  form.querySelector("[name=\"stars\"]").value = item?.stars ?? "";
  form.querySelector("[name=\"language\"]").value = item?.language || "";
  if (dom.projectUpdated) {
    dom.projectUpdated.textContent = item?.updated_at
      ? `Last updated ${formatDate(item.updated_at)}`
      : "";
  }
  renderProjectsList();
};

const fillTopicForm = (topic) => {
  const form = dom.forms.topics;
  if (!form) {
    return;
  }
  form.querySelector("[name=\"id\"]").value = topic?.id || "";
  form.querySelector("[name=\"title\"]").value = topic?.title || "";
  form.querySelector("[name=\"slug\"]").value = topic?.slug || "";
  form.querySelector("[name=\"author_name\"]").value = topic?.author_name || "";
  form.querySelector("[name=\"body\"]").value = topic?.body || "";
  form.querySelector("[name=\"status\"]").value = topic?.status || "open";
  form.querySelector("[name=\"is_locked\"]").checked = Boolean(topic?.is_locked);
  form.querySelector("[name=\"is_unlisted\"]").checked = Boolean(topic?.is_unlisted);
  form.querySelector("[name=\"voice_enabled\"]").checked = Boolean(topic?.voice_enabled);
  renderTopicsList();
  loadTopicComments(topic?.id);
};

const updatePostPreview = () => {
  const form = dom.forms.posts;
  if (!form || !dom.postPreview.container) {
    return;
  }
  const title = form.querySelector("[name=\"title\"]").value.trim() || "Untitled draft";
  const description = form.querySelector("[name=\"description\"]").value.trim();
  const draft = form.querySelector("[name=\"draft\"]").checked;
  const content = form.querySelector("[name=\"content_md\"]").value || "";
  const slug = form.querySelector("[name=\"slug\"]").value.trim();
  const publishedInput = form.querySelector("[name=\"published_at\"]").value;
  const publishedAt = fromInputDateTime(publishedInput) || state.selected.posts?.published_at || null;
  const updatedAt = state.selected.posts?.updated_at || publishedAt;
  const coverUrl = form.querySelector("[name=\"cover_image\"]").value.trim();
  const coverAlt = form.querySelector("[name=\"cover_image_alt\"]").value.trim() || title;
  const tokenEntry = state.selected.posts ? state.previewTokens.get(state.selected.posts.id) : null;
  const previewToken = tokenEntry?.token;
  const publishState = getPublishState({ draft, publishedAt });

  dom.postPreview.meta.textContent = joinMeta([
    publishState.label,
    publishState.isScheduled && publishedAt
      ? `Publishes ${formatDate(publishedAt)}`
      : updatedAt
      ? `Updated ${formatDate(updatedAt)}`
      : null,
  ]);
  dom.postPreview.title.textContent = title;
  dom.postPreview.description.textContent = description || "No description yet.";
  dom.postPreview.body.innerHTML = renderMarkdown(content || "No content yet.");

  if (dom.postPreview.cover) {
    if (coverUrl) {
      dom.postPreview.cover.src = coverUrl;
      dom.postPreview.cover.alt = coverAlt;
      setHidden(dom.postPreview.cover, false);
    } else {
      dom.postPreview.cover.removeAttribute("src");
      dom.postPreview.cover.alt = "";
      setHidden(dom.postPreview.cover, true);
    }
  }

  if (dom.postPreview.note) {
    if (previewToken) {
      dom.postPreview.note.textContent = `Preview link expires ${formatDate(tokenEntry.expiresAt)}`;
      setHidden(dom.postPreview.note, false);
    } else if (publishState.isScheduled && publishedAt) {
      dom.postPreview.note.textContent = `Scheduled for ${formatDate(publishedAt)}. Generate a preview link to share early.`;
      setHidden(dom.postPreview.note, false);
    } else if (draft) {
      dom.postPreview.note.textContent = "Generate a preview link to share this draft.";
      setHidden(dom.postPreview.note, false);
    } else {
      setHidden(dom.postPreview.note, true);
    }
  }

  if (dom.previewGenerate) {
    setHidden(dom.previewGenerate, !(draft || publishState.isScheduled));
  }
  if (dom.publishNow) {
    setHidden(dom.publishNow, publishState.isPublic);
  }
  if (dom.setDraft) {
    setHidden(dom.setDraft, draft);
  }

  if (slug) {
    const previewUrl = new URL(`blog/?slug=${encodeURIComponent(slug)}`, siteBaseUrl);
    if (previewToken) {
      previewUrl.searchParams.set("preview", previewToken);
    }
    dom.postPreview.link.href = previewUrl.toString();
    setHidden(dom.postPreview.link, !(publishState.isPublic || previewToken));
  } else {
    setHidden(dom.postPreview.link, true);
  }

  validatePostForm();
};

let previewTimer = null;
const schedulePostPreview = () => {
  if (previewTimer) {
    window.clearTimeout(previewTimer);
  }
  previewTimer = window.setTimeout(updatePostPreview, 150);
};

const setActiveResource = (resource) => {
  state.active = resource;
  dom.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === resource);
  });
  Object.entries(dom.resources).forEach(([key, section]) => {
    setHidden(section, key !== resource);
  });
  if (resource === "news" && state.isAdmin) {
    loadFeedSources();
    loadIngestLog();
  }
};

const savePost = async () => {
  if (!supabase) {
    return;
  }
  if (!validatePostForm()) {
    setStatus("Fix validation issues before saving.", "error");
    return;
  }
  const form = dom.forms.posts;
  const id = form.querySelector("[name=\"id\"]").value.trim();
  const title = form.querySelector("[name=\"title\"]").value.trim();
  let slug = form.querySelector("[name=\"slug\"]").value.trim();
  const content = form.querySelector("[name=\"content_md\"]").value.trim();

  if (!title || !content) {
    setStatus("Title and content are required.", "error");
    return;
  }

  if (!slug) {
    slug = slugify(title);
    form.querySelector("[name=\"slug\"]").value = slug;
  }

  const publishedInput = form.querySelector("[name=\"published_at\"]").value;
  const publishedAt =
    fromInputDateTime(publishedInput) || state.selected.posts?.published_at || new Date().toISOString();

  const payload = {
    title,
    slug,
    description: form.querySelector("[name=\"description\"]").value.trim() || null,
    content_md: content,
    published_at: publishedAt,
    tags: parseTags(form.querySelector("[name=\"tags\"]").value),
    draft: form.querySelector("[name=\"draft\"]").checked,
    featured: form.querySelector("[name=\"featured\"]").checked,
    cover_image: form.querySelector("[name=\"cover_image\"]").value.trim() || null,
    cover_image_alt: form.querySelector("[name=\"cover_image_alt\"]").value.trim() || null,
  };

  setStatus("Saving post...", "info");
  const query = id
    ? supabase.from("posts").update(payload).eq("id", id).select().single()
    : supabase.from("posts").insert(payload).select().single();

  const { data, error } = await query;
  if (error) {
    setStatus(`Save failed: ${error.message}`, "error");
    return;
  }

  setStatus("Post saved.", "success");
  await loadPosts();
  state.selected.posts = data;
  fillPostForm(data);
};

const saveTopic = async () => {
  if (!supabase) {
    return;
  }
  const form = dom.forms.topics;
  if (!form) {
    return;
  }
  const id = form.querySelector("[name=\"id\"]").value.trim();
  const title = form.querySelector("[name=\"title\"]").value.trim();
  const slug = form.querySelector("[name=\"slug\"]").value.trim();
  const body = form.querySelector("[name=\"body\"]").value.trim();

  if (!title || !slug || !body) {
    setStatus("Title, slug, and body are required.", "error");
    return;
  }

  const payload = {
    title,
    slug,
    body,
    author_name: form.querySelector("[name=\"author_name\"]").value.trim() || null,
    status: form.querySelector("[name=\"status\"]").value || "open",
    is_locked: form.querySelector("[name=\"is_locked\"]").checked,
    is_unlisted: form.querySelector("[name=\"is_unlisted\"]").checked,
    voice_enabled: form.querySelector("[name=\"voice_enabled\"]").checked,
  };

  setStatus("Saving topic...", "info");
  const query = id
    ? supabase.from("topics").update(payload).eq("id", id).select().maybeSingle()
    : supabase.from("topics").insert(payload).select().single();

  const { data, error } = await query;
  if (error) {
    setStatus(`Save failed: ${error.message}`, "error");
    return;
  }
  if (!data) {
    setStatus("Save failed: topic not found or permission denied.", "error");
    return;
  }

  setStatus("Topic saved.", "success");
  await loadTopics();
  state.selected.topics = data;
  fillTopicForm(data);
};

const handlePostSubmit = async (event) => {
  event.preventDefault();
  await savePost();
};

const handleTopicSubmit = async (event) => {
  event.preventDefault();
  await saveTopic();
};

const handlePublishNow = async () => {
  const form = dom.forms.posts;
  if (!form) {
    return;
  }
  form.querySelector("[name=\"draft\"]").checked = false;
  form.querySelector("[name=\"published_at\"]").value = toInputDateTime(new Date().toISOString());
  updatePostPreview();
  await savePost();
};

const handleSetDraft = async () => {
  const form = dom.forms.posts;
  if (!form) {
    return;
  }
  form.querySelector("[name=\"draft\"]").checked = true;
  updatePostPreview();
  await savePost();
};

const getSelectedPostIds = () => Array.from(state.selectedPostIds);

const handleBulkPublish = async () => {
  const ids = getSelectedPostIds();
  if (!ids.length || !supabase) {
    setStatus("Select at least one post.", "error");
    return;
  }
  setStatus("Publishing selected posts...", "info");
  const { error } = await supabase
    .from("posts")
    .update({ draft: false, published_at: new Date().toISOString() })
    .in("id", ids);
  if (error) {
    setStatus(`Bulk publish failed: ${error.message}`, "error");
    return;
  }
  await loadPosts();
  clearPostSelection();
  setStatus("Selected posts published.", "success");
};

const handleBulkDraft = async () => {
  const ids = getSelectedPostIds();
  if (!ids.length || !supabase) {
    setStatus("Select at least one post.", "error");
    return;
  }
  setStatus("Moving selected posts to draft...", "info");
  const { error } = await supabase.from("posts").update({ draft: true }).in("id", ids);
  if (error) {
    setStatus(`Bulk draft failed: ${error.message}`, "error");
    return;
  }
  await loadPosts();
  clearPostSelection();
  setStatus("Selected posts set to draft.", "success");
};

const handleBulkDelete = async () => {
  const ids = getSelectedPostIds();
  if (!ids.length || !supabase) {
    setStatus("Select at least one post.", "error");
    return;
  }
  const confirmed = window.confirm(`Delete ${ids.length} selected posts?`);
  if (!confirmed) {
    return;
  }
  setStatus("Deleting selected posts...", "info");
  const { error } = await supabase.from("posts").delete().in("id", ids);
  if (error) {
    setStatus(`Bulk delete failed: ${error.message}`, "error");
    return;
  }
  await loadPosts();
  clearPostSelection();
  setStatus("Selected posts deleted.", "success");
};

const handleBulkSchedule = async () => {
  const ids = getSelectedPostIds();
  if (!ids.length || !supabase) {
    setStatus("Select at least one post.", "error");
    return;
  }
  if (!dom.bulkScheduleTime) {
    return;
  }
  const value = dom.bulkScheduleTime.value;
  const parsed = fromInputDateTime(value);
  if (!parsed) {
    setStatus("Choose a schedule time first.", "error");
    return;
  }
  if (new Date(parsed) <= new Date()) {
    setStatus("Schedule time must be in the future.", "error");
    return;
  }

  setStatus("Scheduling selected posts...", "info");
  const { error } = await supabase
    .from("posts")
    .update({ draft: false, published_at: parsed })
    .in("id", ids);
  if (error) {
    setStatus(`Bulk schedule failed: ${error.message}`, "error");
    return;
  }
  await loadPosts();
  clearPostSelection();
  dom.bulkScheduleTime.value = "";
  updateBulkScheduleState();
  setStatus("Selected posts scheduled.", "success");
};

const handleNewsImport = async (payloadText) => {
  if (!supabase) {
    return;
  }
  let rawItems = [];
  try {
    rawItems = parseNewsImportPayload(payloadText);
  } catch (error) {
    setNewsImportStatus("Import failed: invalid JSON or CSV.");
    replayNews("import", "Import failed: invalid JSON or CSV.", "error");
    return;
  }

  if (!rawItems.length) {
    setNewsImportStatus("Nothing to import.");
    replayNews("import", "Nothing to import.", "info");
    return;
  }

  const existingUrls = new Set(state.items.news.map((item) => normalizeImportUrl(item.url)));
  const seen = new Set();
  const payloads = [];
  let skippedDuplicates = 0;
  let skippedInvalid = 0;

  rawItems.forEach((raw) => {
    const normalized = normalizeNewsItem(raw);
    if (!normalized.title || !normalized.source || !normalized.url) {
      skippedInvalid += 1;
      return;
    }
    const normalizedUrl = normalizeImportUrl(normalized.url);
    if (!normalizedUrl || existingUrls.has(normalizedUrl) || seen.has(normalizedUrl)) {
      skippedDuplicates += 1;
      return;
    }
    seen.add(normalizedUrl);
    payloads.push({
      ...normalized,
      published_at: normalized.published_at || new Date().toISOString(),
    });
  });

  if (!payloads.length) {
    setNewsImportStatus("No new items to import.");
    replayNews("import", "No new items to import (duplicates or invalid rows).", "info");
    return;
  }

  replayNews("import", `Importing ${payloads.length} link(s)…`, "info");
  const { data, error } = await supabase
    .from("news")
    .upsert(payloads, { onConflict: "url", ignoreDuplicates: true })
    .select("id");
  if (error) {
    setNewsImportStatus(`Import failed: ${error.message}`);
    replayNews("import", `Import failed: ${error.message}`, "error");
    return;
  }

  await loadNews();
  const insertedCount = Array.isArray(data) ? data.length : payloads.length;
  const serverDuplicates = Math.max(0, payloads.length - insertedCount);
  const summary = `Imported ${insertedCount}, skipped ${
    skippedDuplicates + serverDuplicates
  } duplicates, ${skippedInvalid} invalid.`;
  setNewsImportStatus(summary);
  replayNews("import", summary, "success", {
    inserted: insertedCount,
    skippedDuplicates: skippedDuplicates + serverDuplicates,
    skippedInvalid,
  });
};

const getSelectedNewsIds = () => Array.from(state.selectedNewsIds);

const handleNewsBulkPin = async () => {
  const ids = getSelectedNewsIds();
  if (!ids.length || !supabase) {
    replayNews("bulk", "Select at least one news link.", "error");
    return;
  }
  replayNews("bulk", `Pinning ${ids.length} link(s)…`, "info");
  const { error } = await supabase.from("news").update({ pinned: true }).in("id", ids);
  if (error) {
    replayNews("bulk", `Bulk pin failed: ${error.message}`, "error");
    return;
  }
  await loadNews();
  clearNewsSelection();
  replayNews("bulk", `Pinned ${ids.length} link(s).`, "success");
};

const handleNewsBulkUnpin = async () => {
  const ids = getSelectedNewsIds();
  if (!ids.length || !supabase) {
    replayNews("bulk", "Select at least one news link.", "error");
    return;
  }
  replayNews("bulk", `Unpinning ${ids.length} link(s)…`, "info");
  const { error } = await supabase.from("news").update({ pinned: false }).in("id", ids);
  if (error) {
    replayNews("bulk", `Bulk unpin failed: ${error.message}`, "error");
    return;
  }
  await loadNews();
  clearNewsSelection();
  replayNews("bulk", `Unpinned ${ids.length} link(s).`, "success");
};

const handleNewsBulkDelete = async () => {
  const ids = getSelectedNewsIds();
  if (!ids.length || !supabase) {
    replayNews("bulk", "Select at least one news link.", "error");
    return;
  }
  const confirmed = window.confirm(`Delete ${ids.length} selected news links?`);
  if (!confirmed) {
    replayNews("bulk", "Bulk delete cancelled.", "info");
    return;
  }
  replayNews("bulk", `Deleting ${ids.length} link(s)…`, "info");
  const { error } = await supabase.from("news").delete().in("id", ids);
  if (error) {
    replayNews("bulk", `Bulk delete failed: ${error.message}`, "error");
    return;
  }
  await loadNews();
  clearNewsSelection();
  replayNews("bulk", `Deleted ${ids.length} link(s).`, "success");
};

const getSelectedProjectIds = () => Array.from(state.selectedProjectIds);

const handleProjectsBulkDelete = async () => {
  const ids = getSelectedProjectIds();
  if (!ids.length || !supabase) {
    setStatus("Select at least one project.", "error");
    return;
  }
  const confirmed = window.confirm(`Delete ${ids.length} selected projects?`);
  if (!confirmed) {
    return;
  }
  setStatus("Deleting selected projects...", "info");
  const { error } = await supabase.from("projects").delete().in("id", ids);
  if (error) {
    setStatus(`Bulk delete failed: ${error.message}`, "error");
    return;
  }
  await loadProjects();
  clearProjectsSelection();
  setStatus("Selected projects deleted.", "success");
};

const toggleTopicComment = async (commentId, hide) => {
  if (!supabase || !commentId) {
    return;
  }
  setStatus(hide ? "Hiding comment..." : "Restoring comment...", "info");
  const { error } = await supabase
    .from("topic_comments")
    .update({ is_hidden: hide })
    .eq("id", commentId);
  if (error) {
    setStatus(`Comment update failed: ${error.message}`, "error");
    return;
  }
  await loadTopicComments(state.selected.topics?.id);
  setStatus(hide ? "Comment hidden." : "Comment restored.", "success");
};

const autoFillNewsFromUrl = async ({ form, force = false } = {}) => {
  if (!supabase || !form) {
    return null;
  }

  const urlInput = form.querySelector("[name=\"url\"]");
  const titleInput = form.querySelector("[name=\"title\"]");
  const sourceInput = form.querySelector("[name=\"source\"]");
  const summaryInput = form.querySelector("[name=\"summary\"]");
  const publishedInput = form.querySelector("[name=\"published_at\"]");

  const url = urlInput?.value.trim() || "";
  if (!url) {
    setNewsAutofillStatus("Add a URL to fetch metadata.");
    return null;
  }

  if (!isValidUrl(url)) {
    setNewsAutofillStatus("Enter a valid URL.");
    return null;
  }

  const normalizedUrl = normalizeImportUrl(url);
  if (!force && normalizedUrl && normalizedUrl === lastNewsAutofillUrl) {
    return null;
  }

  if (newsAutofillInFlight) {
    return null;
  }

  const functionsKey = getFunctionsKey();
  if (!functionsKey) {
    setNewsAutofillStatus("Auto-fill needs a Supabase anon key (JWT). Update admin/config.js.");
    return null;
  }

  newsAutofillInFlight = true;
  setNewsAutofillStatus("Fetching metadata...");

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${NEWS_ENRICH_FUNCTION}`, {
      method: "POST",
      headers: {
        apikey: functionsKey,
        Authorization: `Bearer ${functionsKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Auto-fill failed (${response.status}).`;
      setNewsAutofillStatus(errorMessage);
      return null;
    }

    lastNewsAutofillUrl = normalizedUrl || url;

    if (titleInput && !titleInput.value.trim() && data.title) {
      titleInput.value = data.title;
    }
    if (sourceInput && !sourceInput.value.trim() && data.source) {
      sourceInput.value = data.source;
    }
    if (summaryInput && !summaryInput.value.trim() && data.summary) {
      summaryInput.value = data.summary;
    }
    if (publishedInput && !publishedInput.value && data.published_at) {
      publishedInput.value = toInputDateTime(data.published_at);
    }

    setNewsAutofillStatus("Auto-fill complete.");
    return data;
  } catch (_error) {
    setNewsAutofillStatus("Auto-fill failed.");
    return null;
  } finally {
    newsAutofillInFlight = false;
  }
};

const handleNewsSubmit = async (event) => {
  event.preventDefault();
  if (!supabase) {
    return;
  }
  const form = dom.forms.news;
  const id = form.querySelector("[name=\"id\"]").value.trim();
  let title = form.querySelector("[name=\"title\"]").value.trim();
  let source = form.querySelector("[name=\"source\"]").value.trim();
  const url = form.querySelector("[name=\"url\"]").value.trim();

  if (url && (!title || !source)) {
    await autoFillNewsFromUrl({ form, force: true });
    title = form.querySelector("[name=\"title\"]").value.trim();
    source = form.querySelector("[name=\"source\"]").value.trim();
  }

  if (!title || !source || !url) {
    setStatus("Title, source, and URL are required.", "error");
    return;
  }

  const publishedInput = form.querySelector("[name=\"published_at\"]").value;
  const publishedAt = fromInputDateTime(publishedInput) || new Date().toISOString();

  const payload = {
    title,
    source,
    url,
    summary: form.querySelector("[name=\"summary\"]").value.trim() || null,
    published_at: publishedAt,
    tags: parseTags(form.querySelector("[name=\"tags\"]").value),
    read_minutes: Number.parseInt(form.querySelector("[name=\"read_minutes\"]").value, 10) || null,
    pinned: form.querySelector("[name=\"pinned\"]").checked,
    featured: form.querySelector("[name=\"featured\"]").checked,
    category: form.querySelector("[name=\"category\"]").value.trim() || null,
  };

  let targetId = id;
  if (!targetId && url) {
    const { data: existing, error: lookupError } = await supabase
      .from("news")
      .select("id")
      .eq("url", url)
      .maybeSingle();
    if (lookupError) {
      replayNews("save", `Lookup failed: ${lookupError.message}`, "error");
      return;
    }
    targetId = existing?.id || "";
  }

  const saveLabel = targetId ? "Updating manual link" : "Saving new manual link";
  replayNews("save", `${saveLabel}: ${title}`, "info");
  const query = targetId
    ? supabase.from("news").update(payload).eq("id", targetId).select().single()
    : supabase.from("news").insert(payload).select().single();

  const { data, error } = await query;
  if (error) {
    replayNews("save", `Save failed: ${error.message}`, "error");
    return;
  }

  const kind = data?.ingest_source
    ? `Synced link saved (${formatIngestFeedLabel(data.ingest_source)})`
    : "Manual link saved";
  replayNews("save", `${kind}: ${data?.title || title}`, "success", { id: data?.id });
  await loadNews();
  state.selected.news = data;
  fillNewsForm(data);
};

const handleProjectsSubmit = async (event) => {
  event.preventDefault();
  if (!supabase) {
    return;
  }
  const form = dom.forms.projects;
  const id = form.querySelector("[name=\"id\"]").value.trim();
  const title = form.querySelector("[name=\"title\"]").value.trim();
  const url = form.querySelector("[name=\"url\"]").value.trim();

  if (!title || !url) {
    setStatus("Title and URL are required.", "error");
    return;
  }

  const payload = {
    title,
    url,
    description: form.querySelector("[name=\"description\"]").value.trim() || null,
    tags: parseTags(form.querySelector("[name=\"tags\"]").value),
    stars: Number.parseInt(form.querySelector("[name=\"stars\"]").value, 10) || null,
    language: form.querySelector("[name=\"language\"]").value.trim() || null,
  };

  setStatus("Saving project...", "info");
  const query = id
    ? supabase.from("projects").update(payload).eq("id", id).select().single()
    : supabase.from("projects").insert(payload).select().single();

  const { data, error } = await query;
  if (error) {
    setStatus(`Save failed: ${error.message}`, "error");
    return;
  }

  setStatus("Project saved.", "success");
  await loadProjects();
  state.selected.projects = data;
  fillProjectsForm(data);
};

const handleDelete = async (resource) => {
  if (!supabase) {
    return;
  }
  const selected = state.selected[resource];
  if (!selected) {
    return;
  }
  const labelMap = {
    posts: "post",
    news: "news link",
    topics: "topic",
    projects: "project",
  };
  const confirmed = window.confirm(`Delete this ${labelMap[resource] || "entry"}?`);
  if (!confirmed) {
    return;
  }
  const { error } = await supabase.from(resource).delete().eq("id", selected.id);
  if (error) {
    setStatus(`Delete failed: ${error.message}`, "error");
    return;
  }

  setStatus("Entry deleted.", "success");
  state.selected[resource] = null;
  if (resource === "posts") {
    await loadPosts();
    resetPostForm();
  }
  if (resource === "news") {
    await loadNews();
    resetNewsForm();
  }
  if (resource === "projects") {
    await loadProjects();
    resetProjectsForm();
  }
  if (resource === "topics") {
    await loadTopics();
    resetTopicForm();
  }
};

const copyTopicShareLink = async () => {
  const topic = state.selected.topics;
  if (!topic?.slug) {
    setStatus("Select a topic to copy the link.", "error");
    return;
  }
  try {
    const url = new URL(`talk/thread/`, siteBaseUrl);
    url.searchParams.set("slug", topic.slug);
    await navigator.clipboard.writeText(url.toString());
    setStatus("Share link copied.", "success");
  } catch (error) {
    setStatus("Copy failed.", "error");
  }
};

const bindSelectableListEvents = (resource, selectedSet, renderList, fillForm) => {
  const list = dom.lists[resource];
  if (!list) {
    return;
  }

  list.addEventListener("click", (event) => {
    const selectButton = event.target.closest("[data-item-select]");
    if (!selectButton) {
      return;
    }
    const itemId = selectButton.dataset.itemId;
    const item = state.items[resource].find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }
    state.selected[resource] = item;
    fillForm(item);
  });

  list.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".list-check");
    if (!checkbox) {
      return;
    }
    const itemId = checkbox.dataset.itemId;
    if (!itemId) {
      return;
    }
    if (checkbox.checked) {
      selectedSet.add(itemId);
    } else {
      selectedSet.delete(itemId);
    }
    renderList();
  });
};

const handleSession = async (session) => {
  state.session = session;
  updateUserBadge(session);
  if (!session) {
    state.previewTokens.clear();
    state.selectedPostIds.clear();
    state.selectedNewsIds.clear();
    state.selectedTopicIds.clear();
    state.selectedProjectIds.clear();
    state.selected.posts = null;
    state.selected.news = null;
    state.selected.topics = null;
    state.selected.projects = null;
    showAuth();
    return;
  }

  setStatus("Checking access...", "info");
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    setStatus("Access denied. Add your user to admin_users.", "error");
    await supabase.auth.signOut();
    showAuth();
    return;
  }

  state.isAdmin = true;
  showDashboard();
  renderAdminConsole();
  setStatus("Syncing content...", "info");
  const cleanupResult = await cleanupPreviewTokens();
  await Promise.all([
    loadPosts(),
    loadNews(),
    loadFeedSources(),
    loadIngestLog(),
    loadTopics(),
    loadProjects(),
    loadActivity(),
    loadSearchAiQueries(),
    loadVisitorLogs(),
  ]);
  if (cleanupResult.error) {
    setStatus("Content synced. Preview cleanup failed.", "success");
    setCleanPreviewsStatus("Cleanup failed");
  } else if (cleanupResult.count) {
    setStatus(`Content synced. Cleared ${cleanupResult.count} expired preview links.`, "success");
    setCleanPreviewsStatus(`Cleaned ${cleanupResult.count}`);
  } else {
    setStatus("Content synced.", "success");
    setCleanPreviewsStatus("No expired previews");
  }
};

const init = async () => {
  if (!hasConfig) {
    setStatus("Missing Supabase config in admin/config.js.", "error");
    if (dom.loginForm) {
      dom.loginForm.querySelector("button").disabled = true;
    }
    showAuth();
    return;
  }

  bindSelectableListEvents("posts", state.selectedPostIds, renderPostsList, fillPostForm);
  bindSelectableListEvents("news", state.selectedNewsIds, renderNewsList, fillNewsForm);
  bindSelectableListEvents("topics", state.selectedTopicIds, renderTopicsList, fillTopicForm);
  bindSelectableListEvents("projects", state.selectedProjectIds, renderProjectsList, fillProjectsForm);

  dom.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveResource(tab.dataset.tab));
  });

  dom.newButtons.posts?.addEventListener("click", resetPostForm);
  dom.newButtons.news?.addEventListener("click", () => {
    resetNewsForm();
    replayNews("form", "New manual link form ready.", "info");
  });
  dom.newButtons.topics?.addEventListener("click", resetTopicForm);
  dom.newButtons.projects?.addEventListener("click", resetProjectsForm);

  dom.deleteButtons.posts?.addEventListener("click", () => handleDelete("posts"));
  dom.deleteButtons.news?.addEventListener("click", () => handleDelete("news"));
  dom.deleteButtons.topics?.addEventListener("click", () => handleDelete("topics"));
  dom.deleteButtons.projects?.addEventListener("click", () => handleDelete("projects"));
  dom.topicCopy?.addEventListener("click", copyTopicShareLink);

  dom.publishNow?.addEventListener("click", handlePublishNow);
  dom.setDraft?.addEventListener("click", handleSetDraft);
  dom.postFilters.forEach((button) => {
    button.addEventListener("click", () => setPostFilter(button.dataset.postFilter));
  });
  dom.postSelectAll?.addEventListener("change", (event) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      state.visiblePostIds.forEach((id) => state.selectedPostIds.add(id));
    } else {
      state.visiblePostIds.forEach((id) => state.selectedPostIds.delete(id));
    }
    renderPostsList();
  });
  dom.newsSelectAll?.addEventListener("change", (event) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      state.visibleNewsIds.forEach((id) => state.selectedNewsIds.add(id));
    } else {
      state.visibleNewsIds.forEach((id) => state.selectedNewsIds.delete(id));
    }
    renderNewsList();
  });
  dom.projectsSelectAll?.addEventListener("change", (event) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      state.visibleProjectIds.forEach((id) => state.selectedProjectIds.add(id));
    } else {
      state.visibleProjectIds.forEach((id) => state.selectedProjectIds.delete(id));
    }
    renderProjectsList();
  });

  dom.bulkPublish?.addEventListener("click", handleBulkPublish);
  dom.bulkDraft?.addEventListener("click", handleBulkDraft);
  dom.bulkDelete?.addEventListener("click", handleBulkDelete);
  dom.newsBulkPin?.addEventListener("click", handleNewsBulkPin);
  dom.newsBulkUnpin?.addEventListener("click", handleNewsBulkUnpin);
  dom.newsBulkDelete?.addEventListener("click", handleNewsBulkDelete);
  dom.newsAutoDelete?.addEventListener("click", handleDeleteAutoIngested);
  dom.newsSyncAll?.addEventListener("click", () => triggerNewsSync());
  dom.newsFeedsRefresh?.addEventListener("click", async () => {
    replayNews("feeds", "Refreshing feeds and ingest log…", "info");
    await Promise.all([loadFeedSources(), loadIngestLog()]);
    replayNews("feeds", "Feeds and ingest log updated.", "success");
  });
  dom.adminConsoleClear?.addEventListener("click", () => {
    state.adminConsole = [];
    renderAdminConsole();
    console.log("[Emad Admin · console]", "Cleared");
  });
  dom.newsFilters.forEach((button) => {
    button.addEventListener("click", () => setNewsFilter(button.dataset.newsFilter));
  });
  dom.newsIngestSourceFilter?.addEventListener("change", () => {
    state.newsIngestSourceFilter = dom.newsIngestSourceFilter.value || "";
    renderNewsList();
    updateNewsCounts();
    const feedLabel = state.newsIngestSourceFilter
      ? formatIngestFeedLabel(state.newsIngestSourceFilter)
      : "All feeds";
    const visible = getFilteredNews().length;
    replayNews(
      "filter",
      `Feed filter: ${feedLabel} · ${visible} shown`,
      "info",
      { feed: state.newsIngestSourceFilter || null, visible }
    );
  });
  dom.newsFeedsPanel?.addEventListener("click", async (event) => {
    const syncButton = event.target.closest("[data-feed-sync]");
    if (!syncButton?.dataset.feedSync) {
      return;
    }
    await triggerNewsSync([syncButton.dataset.feedSync]);
  });
  dom.newsFeedsPanel?.addEventListener("change", async (event) => {
    const enabledInput = event.target.closest("[data-feed-enabled]");
    if (enabledInput?.dataset.feedEnabled) {
      await updateFeedEnabled(enabledInput.dataset.feedEnabled, enabledInput.checked);
    }
  });
  dom.newsFeedsPanel?.addEventListener(
    "blur",
    async (event) => {
      const limitInput = event.target.closest("[data-feed-limit]");
      if (limitInput?.dataset.feedLimit) {
        await updateFeedLimit(limitInput.dataset.feedLimit, limitInput.value);
      }
    },
    true
  );
  dom.projectsBulkDelete?.addEventListener("click", handleProjectsBulkDelete);
  dom.newsImport?.addEventListener("click", async () => {
    const text = dom.newsImportText?.value || "";
    if (!text.trim()) {
      setNewsImportStatus("Paste JSON/CSV or choose a file.");
      return;
    }
    await handleNewsImport(text);
  });
  dom.newsImportFile?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await readFileText(file);
      await handleNewsImport(text);
    } catch (error) {
      setNewsImportStatus("Failed to read file.");
      setStatus("Import failed.", "error");
    }
    dom.newsImportFile.value = "";
  });
  dom.newsImportSampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.newsImportSample;
      if (!type) {
        return;
      }
      applyNewsImportSample(type);
    });
  });
  dom.newsAutofill?.addEventListener("click", async () => {
    await autoFillNewsFromUrl({ form: dom.forms.news, force: true });
  });

  const newsUrlInput = dom.forms.news?.querySelector("[name=\"url\"]");
  const newsTitleInput = dom.forms.news?.querySelector("[name=\"title\"]");
  const newsSourceInput = dom.forms.news?.querySelector("[name=\"source\"]");
  const scheduleNewsAutofill = () => {
    if (!newsUrlInput) {
      return;
    }
    const urlValue = newsUrlInput.value.trim();
    if (!urlValue || !isValidUrl(urlValue)) {
      return;
    }
    if (newsTitleInput?.value.trim() && newsSourceInput?.value.trim()) {
      return;
    }
    if (newsAutofillTimer) {
      window.clearTimeout(newsAutofillTimer);
    }
    newsAutofillTimer = window.setTimeout(() => {
      autoFillNewsFromUrl({ form: dom.forms.news, force: false });
    }, 600);
  };
  newsUrlInput?.addEventListener("blur", async () => {
    if (!newsUrlInput.value.trim()) {
      return;
    }
    if (newsTitleInput?.value.trim() && newsSourceInput?.value.trim()) {
      return;
    }
    await autoFillNewsFromUrl({ form: dom.forms.news, force: false });
  });
  newsUrlInput?.addEventListener("input", scheduleNewsAutofill);
  newsUrlInput?.addEventListener("paste", scheduleNewsAutofill);
  dom.refreshActivity?.addEventListener("click", async () => {
    setStatus("Refreshing activity...", "info");
    await Promise.all([loadActivity(), loadSearchAiQueries(), loadVisitorLogs()]);
    setStatus("Activity updated.", "success");
  });
  dom.cleanPreviews?.addEventListener("click", async () => {
    setStatus("Cleaning preview links...", "info");
    const result = await cleanupPreviewTokens();
    if (result.error) {
      setStatus("Preview cleanup failed.", "error");
      setCleanPreviewsStatus("Cleanup failed");
      return;
    }
    if (result.count) {
      setStatus(`Cleared ${result.count} expired preview links.`, "success");
      setCleanPreviewsStatus(`Cleaned ${result.count}`);
      return;
    }
    setStatus("No expired preview links.", "success");
    setCleanPreviewsStatus("No expired previews");
  });

  dom.bulkScheduleTime?.addEventListener("input", updateBulkScheduleState);
  dom.bulkSchedule?.addEventListener("click", handleBulkSchedule);

  dom.activityResourceFilters.forEach((button) => {
    button.addEventListener("click", () => setActivityFilter("resource", button.dataset.activityResource));
  });
  dom.activityActionFilters.forEach((button) => {
    button.addEventListener("click", () => setActivityFilter("action", button.dataset.activityAction));
  });
  dom.topicFilters.forEach((button) => {
    button.addEventListener("click", () => setTopicFilter(button.dataset.topicFilter));
  });

  dom.forms.posts?.addEventListener("submit", handlePostSubmit);
  dom.forms.news?.addEventListener("submit", handleNewsSubmit);
  dom.forms.topics?.addEventListener("submit", handleTopicSubmit);
  dom.forms.projects?.addEventListener("submit", handleProjectsSubmit);

  const postTitle = dom.forms.posts?.querySelector("[name=\"title\"]");
  const postSlug = dom.forms.posts?.querySelector("[name=\"slug\"]");
  const postContent = dom.forms.posts?.querySelector("[name=\"content_md\"]");
  const postCover = dom.forms.posts?.querySelector("[name=\"cover_image\"]");
  const postCoverAlt = dom.forms.posts?.querySelector("[name=\"cover_image_alt\"]");

  postSlug?.addEventListener("input", () => {
    state.slugTouched = true;
    schedulePostPreview();
  });

  postSlug?.addEventListener("blur", () => {
    if (!postSlug.value.trim()) {
      return;
    }
    const normalized = slugify(postSlug.value);
    if (normalized !== postSlug.value) {
      postSlug.value = normalized;
      schedulePostPreview();
    }
  });

  postTitle?.addEventListener("input", () => {
    if (!state.slugTouched) {
      postSlug.value = slugify(postTitle.value);
    }
    schedulePostPreview();
  });

  postContent?.addEventListener("input", schedulePostPreview);
  postCover?.addEventListener("input", schedulePostPreview);
  postCoverAlt?.addEventListener("input", schedulePostPreview);
  dom.forms.posts?.addEventListener("input", schedulePostPreview);

  dom.coverFile?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await uploadCoverImage(file);
    dom.coverFile.value = "";
  });

  dom.previewGenerate?.addEventListener("click", createPreviewToken);

  dom.loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    const formData = new FormData(dom.loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    setHidden(dom.loginError, true);
    setStatus("Signing in...", "info");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      dom.loginError.textContent = error.message;
      setHidden(dom.loginError, false);
      setStatus("Sign in failed.", "error");
    }
  });

  dom.signOut?.addEventListener("click", () => {
    supabase.auth.signOut();
  });

  const { data } = await supabase.auth.getSession();
  await handleSession(data.session);
  supabase.auth.onAuthStateChange((_event, session) => {
    handleSession(session);
  });

  setActiveResource(state.active);
  updatePostPreview();
};

init();
