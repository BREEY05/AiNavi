const fs = require("fs");
const path = require("path");
const vm = require("vm");
const express = require("express");
const multer = require("multer");
const Database = require("better-sqlite3");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const STATIC_DIR = process.env.STATIC_DIR || __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(STATIC_DIR, "uploads");
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, "site-content.sqlite");
const CONTENT_KEY = "site";
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]);

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
    if (
      base[key] &&
      saved[key] &&
      typeof base[key] === "object" &&
      typeof saved[key] === "object" &&
      !Array.isArray(base[key]) &&
      !Array.isArray(saved[key])
    ) {
      base[key] = merge(base[key], saved[key]);
      return;
    }

    base[key] = saved[key];
  });
  return base;
}

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const safeExt = ext && ext.length <= 8 ? ext : ".jpg";
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${safeExt}`);
    }
  }),
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    if (IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Only image uploads are allowed"));
  }
});

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

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }

  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || error.message === "Only image uploads are allowed") {
    res.status(400).json({ error: error.message });
    return;
  }

  next(error);
});

app.use("/uploads", express.static(UPLOAD_DIR));

app.use(express.static(STATIC_DIR, {
  extensions: ["html"],
  index: "index.html"
}));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Zhihang AI website running at http://0.0.0.0:${PORT}`);
  console.log(`Static files: ${STATIC_DIR}`);
  console.log(`SQLite database: ${DB_FILE}`);
});
