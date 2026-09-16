const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
let mode = "login";
let countdownId;

async function request(url, body) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(payload.error || "请求失败，请稍后再试。");
  return payload;
}

function message(text, error = false) {
  const node = $("[data-auth-message]");
  node.textContent = text;
  node.classList.toggle("error", error);
}

function startCountdown(button, milliseconds = 60000) {
  clearInterval(countdownId);
  const deadline = Date.now() + milliseconds;
  const tick = () => {
    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    button.disabled = seconds > 0;
    button.textContent = seconds ? `重新发送 (${seconds}s)` : "重新发送验证码";
    if (!seconds) clearInterval(countdownId);
  };
  tick();
  countdownId = setInterval(tick, 250);
}

function setMode(nextMode) {
  mode = nextMode;
  clearInterval(countdownId);
  $$('[data-auth-tab]').forEach((tab) => tab.classList.toggle("active", tab.dataset.authTab === mode));
  $$('[data-auth-form]').forEach((form) => {
    form.hidden = form.dataset.authForm !== mode;
    form.reset();
    const codeField = $(".code-field", form);
    const resend = $("[data-resend-code]", form);
    if (codeField) codeField.hidden = true;
    if (resend) resend.hidden = true;
    $("button[type='submit']", form).textContent = mode === "login" ? "登录后台" : "发送注册验证码";
  });
  message("");
}

$$('[data-auth-tab]').forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.authTab)));
$$('[data-auth-form]').forEach((form) => form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("button[type='submit']", form);
  const qq = form.elements.qq.value.trim();
  const password = form.elements.password.value;
  button.disabled = true;
  try {
    if (mode === "login") {
      await request("/api/auth/login", { qq, password });
      window.location.href = "admin.html";
      return;
    }

    const codeField = $(".code-field", form);
    if (codeField.hidden) {
      const result = await request("/api/auth/register/request-code", { qq, password });
      codeField.hidden = false;
      const resend = $("[data-resend-code]", form);
      resend.hidden = false;
      form.elements.code.required = true;
      form.elements.code.focus();
      button.textContent = "验证并提交注册";
      button.disabled = false;
      message(result.message);
      startCountdown(resend);
      return;
    }

    const result = await request("/api/auth/register/verify", { qq, code: form.elements.code.value.trim() });
    setMode("login");
    message(result.message);
  } catch (error) {
    message(error.message, true);
    button.disabled = false;
  }
}));

$$('[data-resend-code]').forEach((button) => button.addEventListener("click", async () => {
  const form = button.closest("form");
  try {
    const result = await request("/api/auth/register/request-code", { qq: form.elements.qq.value.trim(), password: form.elements.password.value });
    message(result.message);
    startCountdown(button);
  } catch (error) {
    message(error.message, true);
  }
}));

ZH_SITE.fetchContent().then((content) => {
  document.documentElement.style.setProperty("--blue", content.themeColor || "#1768ff");
  $("[data-auth-logo]").style.backgroundImage = `url("${content.logo}")`;
}).catch(() => {});
