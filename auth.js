const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
let mode = "login";
let verificationStep = false;
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
  verificationStep = false;
  clearInterval(countdownId);
  $$("[data-auth-tab]").forEach((tab) => tab.classList.toggle("active", tab.dataset.authTab === mode));
  $$("[data-auth-form]").forEach((form) => { form.hidden = form.dataset.authForm !== mode; form.reset(); $(".code-field", form).hidden = true; $("[data-resend-code]", form).hidden = true; $("button[type='submit']", form).textContent = mode === "login" ? "发送登录验证码" : "发送注册验证码"; });
  message("");
}

$$("[data-auth-tab]").forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.authTab)));
$$("[data-auth-form]").forEach((form) => form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("button[type='submit']", form);
  const qq = form.elements.qq.value.trim();
  const password = form.elements.password.value;
  const code = form.elements.code.value.trim();
  button.disabled = true;
  try {
    if (!verificationStep) {
      const endpoint = mode === "login" ? "/api/auth/login/request-code" : "/api/auth/register/request-code";
      const result = await request(endpoint, { qq, password });
      verificationStep = true;
      $(".code-field", form).hidden = false;
      const resend = $("[data-resend-code]", form);
      resend.hidden = false;
      form.elements.code.required = true;
      form.elements.code.focus();
      button.textContent = mode === "login" ? "验证并登录" : "验证并提交注册";
      button.disabled = false;
      message(result.message);
      startCountdown(resend, 60000);
      return;
    }
    const endpoint = mode === "login" ? "/api/auth/login/verify" : "/api/auth/register/verify";
    const result = await request(endpoint, { qq, code });
    if (mode === "login") window.location.href = "admin.html";
    else { setMode("login"); message(result.message); }
  } catch (error) {
    message(error.message, true);
    button.disabled = false;
  }
}));

$$("[data-resend-code]").forEach((button) => button.addEventListener("click", async () => {
  const form = button.closest("form");
  const qq = form.elements.qq.value.trim();
  const password = form.elements.password.value;
  try {
    const endpoint = mode === "login" ? "/api/auth/login/request-code" : "/api/auth/register/request-code";
    const result = await request(endpoint, { qq, password });
    message(result.message);
    startCountdown(button, 60000);
  } catch (error) { message(error.message, true); }
}));

ZH_SITE.fetchContent().then((content) => {
  document.documentElement.style.setProperty("--blue", content.themeColor || "#1768ff");
  $("[data-auth-logo]").style.backgroundImage = `url("${content.logo}")`;
}).catch(() => {});
