import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "https://esm.sh/marked@12";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITE_BASE_URL } from "./config.js";

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
    projects: document.querySelector('[data-resource="projects"]'),
    activity: document.querySelector('[data-resource="activity"]'),
  },
  lists: {
    posts: document.querySelector('[data-list="posts"]'),
    news: document.querySelector('[data-list="news"]'),
    projects: document.querySelector('[data-list="projects"]'),
    activity: document.querySelector('[data-list="activity"]'),
    searchAiQueries: document.querySelector('[data-list="search-ai-queries"]'),
  },
  forms: {
    posts: document.querySelector('[data-form="posts"]'),
    news: document.querySelector('[data-form="news"]'),
    projects: document.querySelector('[data-form="projects"]'),
  },
  newButtons: {
    posts: document.querySelector('[data-new="posts"]'),
    news: document.querySelector('[data-new="news"]'),
    projects: document.querySelector('[data-new="projects"]'),
  },
  deleteButtons: {
    posts: document.querySelector('[data-delete="posts"]'),
    news: document.querySelector('[data-delete="news"]'),
    projects: document.querySelector('[data-delete="projects"]'),
  },
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
    projects: [],
    activity: [],
    searchAiQueries: [],
  },
  selected: {
    posts: null,
    news: null,
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
  selectedProjectIds: new Set(),
  visibleProjectIds: [],
  activityFilters: {
    resource: "all",
    action: "all",
  },
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

const renderNewsList = () => {
  const list = dom.lists.news;
  if (!list) {
    return;
  }
  list.innerHTML = "";
  const visibleNews = state.items.news;
  state.visibleNewsIds = visibleNews.map((item) => item.id);
  if (!visibleNews.length) {
    const empty = document.createElement("p");
    empty.className = "list-empty";
    empty.textContent = "No news links yet.";
    list.appendChild(empty);
    updateNewsSelectionUI();
    return;
  }

  visibleNews.forEach((item) => {
    const actor = formatActor(item.updated_by || item.created_by);
    const meta = joinMeta([
      item.source || null,
      formatDate(item.published_at),
      actor ? `by ${actor}` : null,
    ]);
    const row = buildSelectableListItem({
      id: item.id,
      title: item.title,
      meta,
      isActive: state.selected.news?.id === item.id,
      isSelected: state.selectedNewsIds.has(item.id),
      selectLabel: `Select ${item.title || "news"}`,
    });
    list.appendChild(row);
  });
  updateNewsSelectionUI();
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
  renderNewsList();
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
  form.querySelector("[name=\"category\"]").value = item?.category || "";
  lastNewsAutofillUrl = normalizeImportUrl(item?.url || "");
  setNewsAutofillStatus("");
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

const handlePostSubmit = async (event) => {
  event.preventDefault();
  await savePost();
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
    setStatus("Import failed.", "error");
    return;
  }

  if (!rawItems.length) {
    setNewsImportStatus("Nothing to import.");
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
    return;
  }

  setStatus("Importing news...", "info");
  const { data, error } = await supabase
    .from("news")
    .upsert(payloads, { onConflict: "url", ignoreDuplicates: true })
    .select("id");
  if (error) {
    setNewsImportStatus(`Import failed: ${error.message}`);
    setStatus("Import failed.", "error");
    return;
  }

  await loadNews();
  const insertedCount = Array.isArray(data) ? data.length : payloads.length;
  const serverDuplicates = Math.max(0, payloads.length - insertedCount);
  const summary = `Imported ${insertedCount}, skipped ${
    skippedDuplicates + serverDuplicates
  } duplicates, ${skippedInvalid} invalid.`;
  setNewsImportStatus(summary);
  setStatus("News import complete.", "success");
};

const getSelectedNewsIds = () => Array.from(state.selectedNewsIds);

const handleNewsBulkPin = async () => {
  const ids = getSelectedNewsIds();
  if (!ids.length || !supabase) {
    setStatus("Select at least one news link.", "error");
    return;
  }
  setStatus("Pinning selected news...", "info");
  const { error } = await supabase.from("news").update({ pinned: true }).in("id", ids);
  if (error) {
    setStatus(`Bulk pin failed: ${error.message}`, "error");
    return;
  }
  await loadNews();
  clearNewsSelection();
  setStatus("Selected news pinned.", "success");
};

const handleNewsBulkUnpin = async () => {
  const ids = getSelectedNewsIds();
  if (!ids.length || !supabase) {
    setStatus("Select at least one news link.", "error");
    return;
  }
  setStatus("Unpinning selected news...", "info");
  const { error } = await supabase.from("news").update({ pinned: false }).in("id", ids);
  if (error) {
    setStatus(`Bulk unpin failed: ${error.message}`, "error");
    return;
  }
  await loadNews();
  clearNewsSelection();
  setStatus("Selected news unpinned.", "success");
};

const handleNewsBulkDelete = async () => {
  const ids = getSelectedNewsIds();
  if (!ids.length || !supabase) {
    setStatus("Select at least one news link.", "error");
    return;
  }
  const confirmed = window.confirm(`Delete ${ids.length} selected news links?`);
  if (!confirmed) {
    return;
  }
  setStatus("Deleting selected news...", "info");
  const { error } = await supabase.from("news").delete().in("id", ids);
  if (error) {
    setStatus(`Bulk delete failed: ${error.message}`, "error");
    return;
  }
  await loadNews();
  clearNewsSelection();
  setStatus("Selected news deleted.", "success");
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

    if (titleInput && data.title) {
      titleInput.value = data.title;
    }
    if (sourceInput && data.source) {
      sourceInput.value = data.source;
    }
    if (summaryInput && data.summary) {
      summaryInput.value = data.summary;
    }
    if (publishedInput && data.published_at) {
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
    category: form.querySelector("[name=\"category\"]").value.trim() || null,
  };

  setStatus("Saving link...", "info");
  const query = id
    ? supabase.from("news").update(payload).eq("id", id).select().single()
    : supabase.from("news").insert(payload).select().single();

  const { data, error } = await query;
  if (error) {
    setStatus(`Save failed: ${error.message}`, "error");
    return;
  }

  setStatus("News link saved.", "success");
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
    state.selectedProjectIds.clear();
    state.selected.posts = null;
    state.selected.news = null;
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
  setStatus("Syncing content...", "info");
  const cleanupResult = await cleanupPreviewTokens();
  await Promise.all([
    loadPosts(),
    loadNews(),
    loadProjects(),
    loadActivity(),
    loadSearchAiQueries(),
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
  bindSelectableListEvents("projects", state.selectedProjectIds, renderProjectsList, fillProjectsForm);

  dom.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveResource(tab.dataset.tab));
  });

  dom.newButtons.posts?.addEventListener("click", resetPostForm);
  dom.newButtons.news?.addEventListener("click", resetNewsForm);
  dom.newButtons.projects?.addEventListener("click", resetProjectsForm);

  dom.deleteButtons.posts?.addEventListener("click", () => handleDelete("posts"));
  dom.deleteButtons.news?.addEventListener("click", () => handleDelete("news"));
  dom.deleteButtons.projects?.addEventListener("click", () => handleDelete("projects"));

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
    await Promise.all([loadActivity(), loadSearchAiQueries()]);
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

  dom.forms.posts?.addEventListener("submit", handlePostSubmit);
  dom.forms.news?.addEventListener("submit", handleNewsSubmit);
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
