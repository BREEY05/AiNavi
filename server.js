const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const Database = require("better-sqlite3");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  });
}

loadEnv(path.join(__dirname, ".env"));

const app = express();
const PORT = Number(process.env.PORT || 3000);
const STATIC_DIR = process.env.STATIC_DIR || __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(STATIC_DIR, "uploads");
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, "site-content.sqlite");
const CONTENT_KEY = "site";
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_RESEND_MS = 60 * 1000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const OWNER_QQ = process.env.ADMIN_QQ || "380154843";
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]);

function readDefaults() {
  const source = fs.readFileSync(path.join(__dirname, "site-data.js"), "utf8");
  return vm.runInNewContext(`${source}\n;ZH_SITE.defaults;`, { console, encodeURIComponent, JSON, String });
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function merge(base, saved) {
  Object.keys(saved || {}).forEach((key) => {
    if (base[key] && saved[key] && typeof base[key] === "object" && typeof saved[key] === "object" && !Array.isArray(base[key]) && !Array.isArray(saved[key])) base[key] = merge(base[key], saved[key]);
    else base[key] = saved[key];
  });
  return base;
}
function now() { return new Date().toISOString(); }
function publicUser(user) { return user && { qq: user.qq, status: user.status, role: user.role, createdAt: user.created_at, approvedAt: user.approved_at }; }
function hashSecret(value, salt = crypto.randomBytes(16).toString("hex")) { return `${salt}:${crypto.scryptSync(value, salt, 64).toString("hex")}`; }
function verifySecret(value, stored) {
  const [salt, expected] = String(stored || "").split(":");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(value, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}
function parseCookies(request) { return Object.fromEntries((request.headers.cookie || "").split(";").map((item) => item.trim().split("=")).filter(([key, value]) => key && value)); }
function clientIp(request) { return (request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown").split(",")[0].trim(); }
function validQq(qq) { return /^\d{5,12}$/.test(String(qq || "")); }

function getMailer() {
  if (process.env.MAIL_MODE !== "smtp") return null;
  if (!process.env.QQ_MAIL_AUTH_CODE) throw new Error("未配置 QQ_MAIL_AUTH_CODE，无法发送邮件。");
  return nodemailer.createTransport({ host: "smtp.qq.com", port: 465, secure: true, auth: { user: process.env.QQ_MAIL_USER || `${OWNER_QQ}@qq.com`, pass: process.env.QQ_MAIL_AUTH_CODE } });
}
async function sendCodeEmail(qq, purpose, code) {
  const subject = purpose === "login" ? "智航AI协会后台登录验证码" : "智航AI协会管理员注册验证码";
  const html = `<p>你的验证码为：</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>验证码 10 分钟内有效，请勿向他人泄露。</p>`;
  const mailer = getMailer();
  if (!mailer) return console.log(`[mail:console] ${purpose} code for ${qq}@qq.com: ${code}`);
  await mailer.sendMail({ from: process.env.MAIL_FROM || `智航AI协会 <${process.env.QQ_MAIL_USER || `${OWNER_QQ}@qq.com`}>`, to: `${qq}@qq.com`, subject, html });
}

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const defaults = readDefaults();
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS content (key TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS admin_users (qq TEXT PRIMARY KEY, password_hash TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('pending','approved','disabled','rejected')), role TEXT NOT NULL CHECK(role IN ('owner','admin')) DEFAULT 'admin', created_at TEXT NOT NULL, approved_at TEXT, approved_by TEXT);
  CREATE TABLE IF NOT EXISTS verification_codes (id INTEGER PRIMARY KEY AUTOINCREMENT, qq TEXT NOT NULL, purpose TEXT NOT NULL, code_hash TEXT NOT NULL, payload TEXT, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL, ip TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, qq TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
`);
const selectContent = db.prepare("SELECT json FROM content WHERE key = ?");
const upsertContent = db.prepare("INSERT INTO content (key, json, updated_at) VALUES (@key, @json, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET json = excluded.json, updated_at = CURRENT_TIMESTAMP");
const findUser = db.prepare("SELECT * FROM admin_users WHERE qq = ?");
const listUsers = db.prepare("SELECT qq, status, role, created_at, approved_at, approved_by FROM admin_users ORDER BY created_at DESC");
const createUser = db.prepare("INSERT INTO admin_users (qq, password_hash, status, role, created_at, approved_at, approved_by) VALUES (@qq, @passwordHash, @status, @role, @createdAt, @approvedAt, @approvedBy)");
const updateUserStatus = db.prepare("UPDATE admin_users SET status = ?, approved_at = ?, approved_by = ? WHERE qq = ?");
const latestCode = db.prepare("SELECT * FROM verification_codes WHERE qq = ? AND purpose = ? ORDER BY id DESC LIMIT 1");
const createCode = db.prepare("INSERT INTO verification_codes (qq, purpose, code_hash, payload, expires_at, created_at, ip) VALUES (@qq, @purpose, @codeHash, @payload, @expiresAt, @createdAt, @ip)");
const markCodeUsed = db.prepare("UPDATE verification_codes SET used_at = ? WHERE id = ?");
const codeRate = db.prepare("SELECT COUNT(*) AS count FROM verification_codes WHERE ip = ? AND purpose = ? AND created_at > ?");
const createSession = db.prepare("INSERT INTO auth_sessions (id, qq, expires_at, created_at) VALUES (?, ?, ?, ?)");
const findSession = db.prepare("SELECT s.*, u.status, u.role FROM auth_sessions s JOIN admin_users u ON u.qq = s.qq WHERE s.id = ?");
const deleteSession = db.prepare("DELETE FROM auth_sessions WHERE id = ?");

function getContent() {
  const row = selectContent.get(CONTENT_KEY);
  if (!row) { const initial = clone(defaults); upsertContent.run({ key: CONTENT_KEY, json: JSON.stringify(initial) }); return initial; }
  try { return merge(clone(defaults), JSON.parse(row.json)); } catch (error) { console.error("Stored content JSON is invalid:", error); return clone(defaults); }
}
function saveContent(data) { const content = merge(clone(defaults), data); upsertContent.run({ key: CONTENT_KEY, json: JSON.stringify(content) }); return content; }
function authRequired(request, response, next) {
  const token = parseCookies(request).zhihang_session;
  const session = token && findSession.get(token);
  if (!session || new Date(session.expires_at).getTime() <= Date.now() || session.status !== "approved") return response.status(401).json({ error: "请先登录已获批的管理员账号。" });
  request.user = { qq: session.qq, role: session.role };
  next();
}

function validSession(request) {
  const token = parseCookies(request).zhihang_session;
  const session = token && findSession.get(token);
  return session && new Date(session.expires_at).getTime() > Date.now() && session.status === "approved";
}
function ownerRequired(request, response, next) { if (request.user.role !== "owner") return response.status(403).json({ error: "只有账号所有者可以管理权限。" }); next(); }
async function issueCode(request, response, purpose, payload) {
  const normalizedQq = String(request.body.qq || "");
  const previous = latestCode.get(normalizedQq, purpose);
  const elapsed = previous && Date.now() - new Date(previous.created_at).getTime();
  if (previous && elapsed < CODE_RESEND_MS) return response.status(429).json({ error: "验证码已发送，请 60 秒后再试。", retryAfter: CODE_RESEND_MS - elapsed });
  if (codeRate.get(clientIp(request), purpose, new Date(Date.now() - 60 * 60 * 1000).toISOString()).count >= 5) return response.status(429).json({ error: "请求过于频繁，请一小时后再试。" });
  const code = String(crypto.randomInt(100000, 1000000));
  try {
    await sendCodeEmail(normalizedQq, purpose, code);
    createCode.run({ qq: normalizedQq, purpose, codeHash: hashSecret(code), payload: JSON.stringify(payload || {}), expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(), createdAt: now(), ip: clientIp(request) });
    response.json({ message: "验证码已发送到该 QQ 号对应的 QQ 邮箱。" });
  } catch (error) { console.error("Email failed:", error); response.status(503).json({ error: error.message || "验证码邮件发送失败，请稍后重试。" }); }
}

app.use(express.json({ limit: "50mb" }));
app.post("/api/auth/register/request-code", async (request, response) => {
  const { qq, password } = request.body || {};
  if (!validQq(qq)) return response.status(400).json({ error: "请输入 5 到 12 位 QQ 号。" });
  if (typeof password !== "string" || password.length < 8) return response.status(400).json({ error: "密码至少需要 8 位。" });
  if (findUser.get(String(qq))) return response.status(409).json({ error: "该 QQ 号已注册，请直接登录。" });
  await issueCode(request, response, "register", { passwordHash: hashSecret(password) });
});
app.post("/api/auth/register/verify", (request, response) => {
  const { qq, code } = request.body || {};
  const record = validQq(qq) && latestCode.get(String(qq), "register");
  if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now() || !verifySecret(String(code || ""), record.code_hash)) return response.status(400).json({ error: "验证码无效或已过期。" });
  if (findUser.get(String(qq))) return response.status(409).json({ error: "该 QQ 号已注册。" });
  const isOwner = String(qq) === OWNER_QQ;
  createUser.run({ qq: String(qq), passwordHash: JSON.parse(record.payload).passwordHash, status: isOwner ? "approved" : "pending", role: isOwner ? "owner" : "admin", createdAt: now(), approvedAt: isOwner ? now() : null, approvedBy: isOwner ? String(qq) : null });
  markCodeUsed.run(now(), record.id);
  response.json({ message: isOwner ? "所有者账号已创建，可以登录。" : "注册成功，等待管理员审批后即可登录。", status: isOwner ? "approved" : "pending" });
});
app.post("/api/auth/login", (request, response) => {
  const { qq, password } = request.body || {};
  if (!validQq(qq)) return response.status(400).json({ error: "请输入 5 到 12 位 QQ 号。" });
  const user = findUser.get(String(qq));
  if (!user) return response.status(404).json({ error: "该 QQ 号未注册，请先注册管理员账号。" });
  if (!verifySecret(String(password || ""), user.password_hash)) return response.status(401).json({ error: "密码不正确。" });
  if (user.status !== "approved") return response.status(403).json({ error: user.status === "pending" ? "账号正在等待审批。" : "该账号暂未获得后台访问权限。" });
  const token = crypto.randomBytes(32).toString("base64url");
  createSession.run(token, user.qq, new Date(Date.now() + SESSION_TTL_MS).toISOString(), now());
  response.cookie("zhihang_session", token, { httpOnly: true, sameSite: "lax", secure: request.secure, maxAge: SESSION_TTL_MS, path: "/" });
  response.json({ user: publicUser(user) });
});
app.get("/api/auth/me", authRequired, (request, response) => response.json({ user: request.user }));
app.post("/api/auth/logout", (request, response) => { const token = parseCookies(request).zhihang_session; if (token) deleteSession.run(token); response.clearCookie("zhihang_session", { path: "/" }); response.status(204).end(); });
app.get("/api/accounts", authRequired, ownerRequired, (request, response) => response.json(listUsers.all()));
app.patch("/api/accounts/:qq", authRequired, ownerRequired, (request, response) => {
  const target = findUser.get(request.params.qq); const status = request.body && request.body.status;
  if (!target) return response.status(404).json({ error: "账号不存在。" });
  if (!['approved', 'disabled', 'rejected', 'pending'].includes(status)) return response.status(400).json({ error: "无效的账号状态。" });
  if (target.role === "owner") return response.status(400).json({ error: "所有者账号不能在此修改权限。" });
  updateUserStatus.run(status, status === "approved" ? now() : null, status === "approved" ? request.user.qq : null, target.qq);
  response.json({ user: publicUser(findUser.get(target.qq)) });
});
app.get("/api/content", (request, response) => response.json(getContent()));
app.post("/api/content", authRequired, (request, response) => {
  if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) return response.status(400).json({ error: "JSON object body is required" });
  response.json(saveContent(request.body));
});
const upload = multer({
  storage: multer.diskStorage({ destination: (request, file, callback) => callback(null, UPLOAD_DIR), filename: (request, file, callback) => { const ext = path.extname(file.originalname || "").toLowerCase(); callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext && ext.length <= 8 ? ext : ".jpg"}`); } }),
  limits: { fileSize: MAX_UPLOAD_SIZE }, fileFilter: (request, file, callback) => IMAGE_MIME_TYPES.has(file.mimetype) ? callback(null, true) : callback(new Error("Only image uploads are allowed"))
});
app.post("/api/upload", authRequired, upload.single("image"), (request, response) => request.file ? response.json({ url: `/uploads/${request.file.filename}` }) : response.status(400).json({ error: "Image file is required" }));
app.use((error, request, response, next) => { if (error instanceof multer.MulterError || error.message === "Only image uploads are allowed") return response.status(400).json({ error: error.message }); console.error(error); response.status(500).json({ error: "服务器发生错误。" }); });
app.use("/uploads", express.static(UPLOAD_DIR));
app.get("/admin.html", (request, response, next) => validSession(request) ? next() : response.redirect("/login.html"));
app.use(express.static(STATIC_DIR, { extensions: ["html"], index: "index.html" }));
app.listen(PORT, "0.0.0.0", () => console.log(`Zhihang AI website running at http://0.0.0.0:${PORT}`));
