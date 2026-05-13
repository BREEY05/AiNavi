const fs = require("fs");
const path = require("path");
const vm = require("vm");
const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const STATIC_DIR = process.env.STATIC_DIR || __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, "site-content.sqlite");
const CONTENT_KEY = "site";

function readDefaults() {
  const source = fs.readFileSync(path.join(__dirname, "site-data.js"), "utf8");
  const sandbox = {
    console,
    encodeURIComponent,
    JSON,
    String
  };
  return vm.runInNewContext(`${source}\n;ZH_SITE.defaults;`, sandbox);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function merge(base, saved) {
  Object.keys(saved || {}).forEach((key) => {
    base[key] = saved[key];
  });
  return base;
}

fs.mkdirSync(DATA_DIR, { recursive: true });

const defaults = readDefaults();
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS content (
    key TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const selectContent = db.prepare("SELECT json FROM content WHERE key = ?");
const upsertContent = db.prepare(`
  INSERT INTO content (key, json, updated_at)
  VALUES (@key, @json, CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET
    json = excluded.json,
    updated_at = CURRENT_TIMESTAMP
`);

function getContent() {
  const row = selectContent.get(CONTENT_KEY);
  if (!row) {
    const initial = clone(defaults);
    upsertContent.run({ key: CONTENT_KEY, json: JSON.stringify(initial) });
    return initial;
  }

  try {
    return merge(clone(defaults), JSON.parse(row.json));
  } catch (error) {
    console.error("Stored content JSON is invalid, falling back to defaults:", error);
    return clone(defaults);
  }
}

function saveContent(data) {
  const content = merge(clone(defaults), data);
  upsertContent.run({ key: CONTENT_KEY, json: JSON.stringify(content) });
  return content;
}

app.use(express.json({ limit: "50mb" }));

app.get("/api/content", (req, res) => {
  res.json(getContent());
});

app.post("/api/content", (req, res) => {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ error: "JSON object body is required" });
    return;
  }

  res.json(saveContent(req.body));
});

app.use(express.static(STATIC_DIR, {
  extensions: ["html"],
  index: "index.html"
}));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Zhihang AI website running at http://0.0.0.0:${PORT}`);
  console.log(`Static files: ${STATIC_DIR}`);
  console.log(`SQLite database: ${DB_FILE}`);
});
