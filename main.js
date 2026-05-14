let siteContent = ZH_SITE.load();
let loginStep = "primary";
let secretClicks = 0;
let secretTimer = null;
let achievementPage = 0;
let chartsArmed = false;
let chartsAnimated = false;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function ensureSharedModals() {
  if (!$("[data-login-modal]")) {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="login-modal" data-login-modal hidden>
        <form class="login-card" data-login-form>
          <button class="close-button" type="button" data-close-login aria-label="关闭">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
          <h2>内部登录</h2>
          <p data-login-hint>请输入内部验证码进入内容管理。</p>
          <div data-login-step="primary">
            <label for="login-code-primary">内部验证码</label>
            <input id="login-code-primary" type="password" autocomplete="current-password" placeholder="请输入内部验证码">
          </div>
          <div data-login-step="secondary" hidden>
            <label for="login-code-secondary">第二重登录码</label>
            <input id="login-code-secondary" type="password" autocomplete="current-password" placeholder="请输入第二重登录码">
          </div>
          <button class="primary-button" type="submit" data-login-submit>进入后台</button>
          <span class="form-message" data-login-message></span>
        </form>
      </div>
    `);
  }
}

function applyTheme() {
  document.documentElement.style.setProperty("--blue", siteContent.themeColor || "#1768ff");
}

function highlight(value) {
  return ZH_SITE.escapeHtml(value).replace(/AI/g, "<span>AI</span>").replace(/鏃犻檺鍙兘/g, "<span>鏃犻檺鍙兘</span>");
}

function chartColor(index) {
  return ["#1768ff", "#19a680", "#f18423", "#8561ec", "#14a7d8", "#e0a000"][index % 6];
}

function renderShell() {
  applyTheme();
  $$("[data-logo]").forEach((node) => {
    node.style.backgroundImage = `url("${siteContent.logo}")`;
  });
  $$("[data-text='siteName']").forEach((node) => {
    node.textContent = siteContent.siteName;
  });
}

function renderHome() {
  if (!document.body.matches("[data-page='home']")) return;
  $("[data-image='heroImage']").src = siteContent.heroImage;
  $("[data-text='heroTitle']").innerHTML = highlight(siteContent.heroTitle);
  $("[data-text='heroSubtitle']").innerHTML = highlight(siteContent.heroSubtitle);
  $("[data-text='heroLine']").textContent = siteContent.heroLine;
  $("[data-text='clubIntro']").textContent = siteContent.clubIntro;

  $("[data-list='announcements']").innerHTML = siteContent.announcements.slice(0, 4).map((item, index) => `
    <button class="notice-item" type="button" data-open-detail="announcements" data-index="${index}">
      <span class="tag ${item.type || "info"}">${ZH_SITE.escapeHtml(item.tag)}</span>
      <strong>${ZH_SITE.escapeHtml(item.title)}</strong>
      <time>${ZH_SITE.escapeHtml(item.date)}</time>
    </button>
  `).join("");

  $("[data-list='features']").innerHTML = siteContent.features.map((item) => `
    <div class="feature-item">
      <span>${ZH_SITE.icon(item.icon)}</span>
      <b>${ZH_SITE.escapeHtml(item.title)}</b>
    </div>
  `).join("");

  $("[data-list='activities']").innerHTML = siteContent.activities.slice(0, 3).map((item, index) => `
    <button class="activity-item" type="button" data-open-detail="activities" data-index="${index}">
      <img src="${item.image}" alt="${ZH_SITE.escapeHtml(item.title)}">
      <div>
        <strong>${ZH_SITE.escapeHtml(item.title)}</strong>
        <p>
          <span>${ZH_SITE.escapeHtml(item.date)}</span>
          <span class="pin"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-5.4 7-12a7 7 0 0 0-14 0c0 6.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>${ZH_SITE.escapeHtml(item.place)}</span>
        </p>
      </div>
    </button>
  `).join("");

  renderAchievements();
}

function renderAchievements() {
  if (!document.body.matches("[data-page='home']")) return;
  const achievements = siteContent.achievements || [];
  const pageSize = 3;
  const maxPage = Math.max(0, Math.ceil(achievements.length / pageSize) - 1);
  achievementPage = Math.min(achievementPage, maxPage);
  const visible = achievements.slice(achievementPage * pageSize, achievementPage * pageSize + pageSize);

  $("[data-list='home-projects']").innerHTML = visible.map((item) => `
    <figure class="achievement-item">
      <img src="${item.image}" alt="${ZH_SITE.escapeHtml(item.title)}">
      <figcaption>
        <strong>${ZH_SITE.escapeHtml(item.title)}</strong>
        <span>${ZH_SITE.escapeHtml(item.note || "成果展示")}</span>
      </figcaption>
    </figure>
  `).join("");

  $$(`[data-achievement-prev], [data-achievement-next]`).forEach((button) => {
    button.hidden = achievements.length <= pageSize;
  });
}

function renderAbout() {
  if (!document.body.matches("[data-page='about']")) return;
  const about = siteContent.about;
  $("[data-about-title]").textContent = about.title;
  $("[data-about-subtitle]").textContent = about.subtitle;
  $("[data-about-image]").src = about.image;
  $("[data-about-mission]").textContent = about.missionTitle;
  $("[data-about-paragraphs]").innerHTML = about.paragraphs.map((text) => `<p>${ZH_SITE.escapeHtml(text)}</p>`).join("");
  $("[data-about-stats]").innerHTML = about.stats.map((item, index) => `
    <a class="stat-card" href="${index === 0 ? "members.html" : index === 1 ? "projects.html" : "#"}">
      <strong>${ZH_SITE.escapeHtml(item.value)}</strong>
      <span>${ZH_SITE.escapeHtml(item.label)}</span>
    </a>
  `).join("");
  renderAboutCharts();
}

function pieSegments(items) {
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0) || 1;
  let start = 0;
  return items.map((item, index) => {
    const percent = Math.max(0, Number(item.value) || 0) / total * 100;
    const end = start + percent;
    const segment = `${item.color || chartColor(index)} ${start}% ${end}%`;
    start = end;
    return segment;
  }).join(", ");
}

function renderAboutCharts() {
  const root = $("[data-about-charts]");
  if (!root) return;
  const charts = (siteContent.about && siteContent.about.charts) || [];
  root.innerHTML = charts.map((chart) => {
    const items = chart.items || [];
    const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0);
    return `
      <article class="chart-card">
        <h3>${ZH_SITE.escapeHtml(chart.title)}</h3>
        <div class="pie-chart" style="--pie:${pieSegments(items)}"></div>
        <div class="chart-legend">
          ${items.map((item, index) => {
            const value = Number(item.value) || 0;
            const percent = total ? Math.round(value / total * 100) : 0;
            return `<span><i style="background:${item.color || chartColor(index)}"></i>${ZH_SITE.escapeHtml(item.label)} ${percent}%</span>`;
          }).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function armAboutChartWheel() {
  const section = $("[data-about-chart-section]");
  if (!section || chartsArmed) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      chartsArmed = true;
      observer.disconnect();
    }
  }, { threshold: 0.35 });
  observer.observe(section);
}

function animateAboutCharts() {
  if (!document.body.matches("[data-page='about']") || !chartsArmed || chartsAnimated) return;
  chartsAnimated = true;
  $$(".pie-chart").forEach((chart) => chart.classList.add("animate"));
}

function renderMembers() {
  if (!document.body.matches("[data-page='members']")) return;
  $("[data-member-profiles]").innerHTML = siteContent.memberProfiles.map((item) => `
    <article class="member-profile-card">
      <img src="${item.image}" alt="${ZH_SITE.escapeHtml(item.name)}">
      <div>
        <strong>${ZH_SITE.escapeHtml(item.name)}</strong>
        <span>${ZH_SITE.escapeHtml(item.title)}</span>
        <p>${ZH_SITE.escapeHtml(item.awards || "鏆傛棤鑾峰鎯呭喌")}</p>
      </div>
    </article>
  `).join("");
  $("[data-club-moments]").innerHTML = siteContent.clubMoments.map((item) => `
    <figure class="moment-card">
      <img src="${item.image}" alt="${ZH_SITE.escapeHtml(item.title)}">
      <figcaption>
        <strong>${ZH_SITE.escapeHtml(item.title)}</strong>
        <span>${ZH_SITE.escapeHtml(item.text)}</span>
      </figcaption>
    </figure>
  `).join("");
}

function renderProjects() {
  if (!document.body.matches("[data-page='projects']")) return;
  $("[data-projects-grid]").innerHTML = siteContent.projects.map((item) => `
    <article class="project-card">
      <img src="${item.image}" alt="${ZH_SITE.escapeHtml(item.title)}">
      <div>
        <span>${ZH_SITE.escapeHtml(item.category)}</span>
        <h2>${ZH_SITE.escapeHtml(item.title)}</h2>
        <strong class="project-award">${ZH_SITE.escapeHtml(item.award || "成果奖项待补充")}</strong>
        <p>${ZH_SITE.escapeHtml(item.detail)}</p>
      </div>
    </article>
  `).join("");
}

function renderActivitiesPage() {
  if (!document.body.matches("[data-page='activities']")) return;
  $("[data-activity-feed]").innerHTML = siteContent.activities.map((item, index) => `
    <button class="activity-feed-item" type="button" data-open-detail="activities" data-index="${index}">
      <img src="${item.image}" alt="${ZH_SITE.escapeHtml(item.title)}">
      <div>
        <h2>${ZH_SITE.escapeHtml(item.title)}</h2>
        <p class="feed-meta">${ZH_SITE.escapeHtml(item.date)} · ${ZH_SITE.escapeHtml(item.place)}</p>
        <p>${ZH_SITE.escapeHtml(item.detail)}</p>
      </div>
    </button>
  `).join("");
}

function renderJoin() {
  if (!document.body.matches("[data-page='join']")) return;
  const join = siteContent.join;
  $("[data-join-title]").textContent = join.title;
  $("[data-join-subtitle]").textContent = join.subtitle;
  $("[data-join-logo]").style.backgroundImage = `url("${siteContent.logo}")`;
  $("[data-join-intro]").textContent = join.intro;
  $("[data-join-address]").textContent = join.address;
  $("[data-join-email]").textContent = join.email;
  $("[data-join-phone]").textContent = join.phone;
  $("[data-join-recruit-title]").textContent = join.recruitTitle;
  $("[data-join-recruit-info]").innerHTML = ZH_SITE.escapeHtml(join.recruitInfo).replace(/\n/g, "<br>");
}

function openDetail(type, index) {
  const item = siteContent[type][index];
  if (!item || !$("[data-detail-modal]")) return;
  const isActivity = type === "activities";
  $("[data-detail-content]").innerHTML = `
    ${isActivity ? `<img class="detail-image" src="${item.image}" alt="${ZH_SITE.escapeHtml(item.title)}">` : ""}
    <div class="detail-kicker">${isActivity ? "近期活动" : "最新公告"}</div>
    <h2>${ZH_SITE.escapeHtml(item.title)}</h2>
    <div class="detail-meta">
      <span>${ZH_SITE.escapeHtml(item.date || "")}</span>
      ${isActivity ? `<span>${ZH_SITE.escapeHtml(item.place || "")}</span>` : `<span>${ZH_SITE.escapeHtml(item.tag || "")}</span>`}
    </div>
    <p>${ZH_SITE.escapeHtml(item.detail || "暂无详情。")}</p>
  `;
  $("[data-detail-modal]").hidden = false;
}

function openList(type) {
  if (!$("[data-detail-modal]")) return;
  const title = type === "activities" ? "近期活动" : "最新公告";
  const items = siteContent[type] || [];
  $("[data-detail-content]").innerHTML = `
    <div class="detail-kicker">全部内容</div>
    <h2>${title}</h2>
    <div class="detail-list">
      ${items.map((item, index) => `
        <button type="button" data-open-detail="${type}" data-index="${index}">
          <strong>${ZH_SITE.escapeHtml(item.title)}</strong>
          <span>${ZH_SITE.escapeHtml(item.date || "")}${type === "activities" ? ` · ${ZH_SITE.escapeHtml(item.place || "")}` : ""}</span>
        </button>
      `).join("")}
    </div>
  `;
  $("[data-detail-modal]").hidden = false;
}

function closeDetail() {
  if ($("[data-detail-modal]")) $("[data-detail-modal]").hidden = true;
}

function openLogin() {
  resetLoginFlow();
  $("[data-login-modal]").hidden = false;
  $("#login-code-primary").focus();
}

function closeLogin() {
  $("[data-login-modal]").hidden = true;
  resetLoginFlow();
}

function resetLoginFlow() {
  loginStep = "primary";
  $("[data-login-step='primary']").hidden = false;
  $("[data-login-step='secondary']").hidden = true;
  $("[data-login-hint]").textContent = "请输入内部验证码进入内容管理。";
  $("[data-login-submit]").textContent = "进入后台";
  $("[data-login-message]").textContent = "";
  $("#login-code-primary").value = "";
  $("#login-code-secondary").value = "";
}

function showSecondaryLogin() {
  loginStep = "secondary";
  $("[data-login-step='primary']").hidden = true;
  $("[data-login-step='secondary']").hidden = false;
  $("[data-login-hint]").textContent = "请继续完成第二重验证。";
  $("[data-login-submit]").textContent = "进入后台";
  $("[data-login-message]").textContent = "";
  $("#login-code-secondary").focus();
}

function bindEvents() {
  const secretEntry = $("[data-secret-login]");
  if (secretEntry) {
    secretEntry.addEventListener("click", () => {
      secretClicks += 1;
      window.clearTimeout(secretTimer);
      secretTimer = window.setTimeout(() => { secretClicks = 0; }, 900);
      if (secretClicks >= 3) {
        secretClicks = 0;
        openLogin();
      }
    });
  }

  const closeLoginButton = $("[data-close-login]");
  if (closeLoginButton) closeLoginButton.addEventListener("click", closeLogin);
  const menuButton = $("[data-menu-toggle]");
  if (menuButton) menuButton.addEventListener("click", () => $(".main-nav").classList.toggle("open"));
  const closeDetailButton = $("[data-close-detail]");
  if (closeDetailButton) closeDetailButton.addEventListener("click", closeDetail);
  const achievementPrev = $("[data-achievement-prev]");
  if (achievementPrev) achievementPrev.addEventListener("click", () => {
    const count = (siteContent.achievements || []).length;
    const maxPage = Math.max(0, Math.ceil(count / 3) - 1);
    achievementPage = achievementPage <= 0 ? maxPage : achievementPage - 1;
    renderAchievements();
  });
  const achievementNext = $("[data-achievement-next]");
  if (achievementNext) achievementNext.addEventListener("click", () => {
    const count = (siteContent.achievements || []).length;
    const maxPage = Math.max(0, Math.ceil(count / 3) - 1);
    achievementPage = achievementPage >= maxPage ? 0 : achievementPage + 1;
    renderAchievements();
  });
  window.addEventListener("wheel", animateAboutCharts, { passive: true });
  armAboutChartWheel();
  const detailModal = $("[data-detail-modal]");
  if (detailModal) {
    detailModal.addEventListener("click", (event) => {
      if (event.target.matches("[data-detail-modal]")) closeDetail();
    });
  }
  $("[data-login-modal]").addEventListener("click", (event) => {
    if (event.target.matches("[data-login-modal]")) closeLogin();
  });

  $("[data-login-form]").addEventListener("submit", (event) => {
    event.preventDefault();
    if (loginStep === "primary") {
      if ($("#login-code-primary").value.trim() !== ZH_SITE.LOGIN_CODE_PRIMARY) {
        $("[data-login-message]").textContent = "内部验证码不正确，请重新输入。";
        return;
      }
      showSecondaryLogin();
      return;
    }

    if ($("#login-code-secondary").value.trim() !== ZH_SITE.LOGIN_CODE_SECONDARY) {
      $("[data-login-message]").textContent = "第二重登录码不正确，请重新输入。";
      return;
    }
    sessionStorage.setItem("zhihang-admin-auth", "1");
    window.location.href = "admin.html";
  });

  document.addEventListener("click", (event) => {
    const detailButton = event.target.closest("[data-open-detail]");
    if (detailButton) {
      openDetail(detailButton.dataset.openDetail, Number(detailButton.dataset.index));
      return;
    }

    const listButton = event.target.closest("[data-open-list]");
    if (listButton) openList(listButton.dataset.openList);
  });
}

function renderAll() {
  renderShell();
  renderHome();
  renderAbout();
  renderMembers();
  renderProjects();
  renderActivitiesPage();
  renderJoin();
}

ensureSharedModals();
renderAll();
bindEvents();

ZH_SITE.fetchContent()
  .then((content) => {
    siteContent = content;
    renderAll();
  })
  .catch((error) => {
    console.error("Failed to refresh site content:", error);
  });
