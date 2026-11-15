// @ts-check

/** @typedef {import('./content-types.d.ts').JsonValue} JsonValue */
/** @typedef {import('./content-types.d.ts').JsonRecord} JsonRecord */

/** @param {JsonValue | undefined} value @param {string} path @returns {JsonRecord} */
function record(value, path) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`Expected an object at ${path}.`);
  return value;
}

/** @param {JsonValue | undefined} value @param {string} path @returns {string} */
function text(value, path) {
  if (typeof value !== 'string') throw new TypeError(`Expected text at ${path}.`);
  return value;
}

/** @param {JsonValue | undefined} value @param {string} path @returns {number} */
function number(value, path) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError(`Expected a nonnegative number at ${path}.`);
  return value;
}

/** @template T @param {JsonValue | undefined} value @param {string} path @param {(value: JsonValue, path: string) => T} parse @returns {T[]} */
function list(value, path, parse) {
  if (!Array.isArray(value)) throw new TypeError(`Expected a list at ${path}.`);
  return value.map((item, index) => parse(item, `${path}[${index}]`));
}

/** @template {string} K @param {JsonValue} value @param {string} path @param {readonly K[]} keys @returns {Record<K, string>} */
function fields(value, path, keys) {
  const item = record(value, path);
  return /** @type {Record<K, string>} */ (Object.fromEntries(keys.map(key => [key, text(item[key], `${path}.${key}`)])));
}

/** @param {JsonValue} value */
export function parseContent(value) {
  const root = record(value, 'content');
  const about = record(root.about, 'content.about');
  return {
    ...fields(root, 'content', ['siteName', 'logo', 'themeColor', 'heroTitle', 'heroSubtitle', 'heroLine', 'heroImage', 'clubIntro']),
    features: list(root.features, 'content.features', (item, path) => fields(item, path, ['icon', 'title'])),
    achievements: list(root.achievements, 'content.achievements', (item, path) => fields(item, path, ['title', 'image', 'note'])),
    announcements: list(root.announcements, 'content.announcements', (item, path) => fields(item, path, ['title', 'tag', 'type', 'date', 'detail', 'link'])),
    activities: list(root.activities, 'content.activities', (item, path) => fields(item, path, ['title', 'tag', 'type', 'date', 'place', 'image', 'detail'])),
    projects: list(root.projects, 'content.projects', (item, path) => fields(item, path, ['title', 'category', 'award', 'image', 'detail'])),
    memberProfiles: list(root.memberProfiles, 'content.memberProfiles', (item, path) => fields(item, path, ['name', 'title', 'awards', 'image'])),
    clubMoments: list(root.clubMoments, 'content.clubMoments', (item, path) => fields(item, path, ['title', 'text', 'image'])),
    about: {
      ...fields(about, 'content.about', ['title', 'subtitle', 'image', 'missionTitle']),
      paragraphs: list(about.paragraphs, 'content.about.paragraphs', text),
      stats: list(about.stats, 'content.about.stats', (item, path) => fields(item, path, ['value', 'label'])),
      charts: list(about.charts, 'content.about.charts', (value, path) => {
        const chart = record(value, path);
        return {title: text(chart.title, `${path}.title`), items: list(chart.items, `${path}.items`, (value, path) => {
          const item = record(value, path);
          return {...fields(item, path, ['label', 'color']), value: number(item.value, `${path}.value`)};
        })};
      }),
    },
    join: fields(record(root.join, 'content.join'), 'content.join', ['title', 'subtitle', 'visualImage', 'address', 'email', 'phone', 'intro', 'recruitTitle', 'recruitInfo']),
  };
}

/** @typedef {ReturnType<typeof parseContent>} SiteContent */

/** @param {string} value @returns {string} */
export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character] || character));
}

/** @param {string} value @param {string} base @returns {string} */
export function imageUrl(value, base) {
  const url = new URL(value, base);
  if (['http:', 'https:'].includes(url.protocol) || /^data:image\/(png|jpeg|gif|webp|svg\+xml)[;,]/i.test(value)) return url.href;
  throw new TypeError(`Unsupported image URL protocol: ${url.protocol}`);
}

/** @param {string} value @param {string} base @returns {string} */
export function linkUrl(value, base) {
  const url = new URL(value, base);
  if (['http:', 'https:'].includes(url.protocol)) return url.href;
  throw new TypeError(`Unsupported announcement URL protocol: ${url.protocol}`);
}

/** @param {string} value @returns {number} */
function dateRank(value) {
  const full = value.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (full) return Number(full[1]) * 10000 + Number(full[2]) * 100 + Number(full[3]);
  const short = value.match(/(\d{1,2})[-/.](\d{1,2})/);
  return short ? Number(short[1]) * 100 + Number(short[2]) : 0;
}

/** @template {{date: string}} T @param {readonly T[]} items @returns {T[]} */
export function newest(items) {
  return items.map((item, index) => ({item, index})).sort((a, b) => dateRank(b.item.date) - dateRank(a.item.date) || b.index - a.index).map(entry => entry.item);
}
