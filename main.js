let siteContent = ZH_SITE.load();
let achievementPage = 0;
let chartsArmed = false;
let chartsAnimated = false;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function applyTheme() {
  document.documentElement.style.setProperty("--blue", siteContent.themeColor || "#1768ff");
}

function highlight(value) {
  return ZH_SITE.escapeHtml(value).replace(/AI/g, "<span>AI</span>").replace(/鏃犻檺鍙兘/g, "<span>鏃犻檺鍙兘</span>");
}

function chartColor(index) {
  return ["#86aefb", "#8fd6c2", "#f5bf82", "#b7a5f3", "#8ecfe5", "#ead98d"][index % 6];
}

function dateRank(value) {
  const text = String(value || "");
  const full = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (full) return Number(full[1]) * 10000 + Number(full[2]) * 100 + Number(full[3]);
  const short = text.match(/(\d{1,2})[-/.](\d{1,2})/);
  if (short) return Number(short[1]) * 100 + Number(short[2]);
  return 0;
}

function byNewest(items) {
  return (items || [])
    .map((item, index) => ({ item, index }))
    .sort((a, b) => dateRank(b.item.date) - dateRank(a.item.date) || b.index - a.index);
}

function renderShell() {
  applyTheme();
  $$("[data-logo]").forEach((node) => {
    node.style.backgroundImage = `url("${siteContent.logo}")`;
  });
  $$("[data-text='siteName']").forEach((node) => {
    node.textContent = siteContent.siteName;
  });
  if (!$("[data-site-footer]")) {
    document.body.insertAdjacentHTML("beforeend", `
      <footer class="site-footer" data-site-footer>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">渝ICP备2026009718号-1</a>
      </footer>
    `);
  }
}

function renderHome() {
  if (!document.body.matches("[data-page='home']")) return;
  $("[data-image='heroImage']").src = siteContent.heroImage;
  $("[data-text='heroTitle']").innerHTML = highlight(siteContent.heroTitle);
  $("[data-text='heroSubtitle']").innerHTML = highlight(siteContent.heroSubtitle);
  $("[data-text='heroLine']").textContent = siteContent.heroLine;
  $("[data-text='clubIntro']").textContent = siteContent.clubIntro;

  $("[data-list='announcements']").innerHTML = byNewest(siteContent.announcements).slice(0, 4).map(({ item, index }) => `
    <button class="notice-item" type="button" data-open-detail="announcements" data-index="${index}">
      <span class="tag ${item.type || "info"}">${ZH_SITE.escapeHtml(item.tag)}</span>
      <strong>${ZH_SITE.escapeHtml(item.title)}</strong>
      <time>${ZH_SITE.escapeHtml(item.date)}</time>
      ${item.link ? `<a href="${ZH_SITE.escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" style="grid-column:2;color:var(--blue);font-size:0.88rem;" onclick="event.stopPropagation()">链接 →</a>` : ""}
    </button>
  `).join("");

  $("[data-list='features']").innerHTML = siteContent.features.map((item) => `
    <div class="feature-item">
      <span>${ZH_SITE.icon(item.icon)}</span>
      <b>${ZH_SITE.escapeHtml(item.title)}</b>
    </div>
  `).join("");

  $("[data-list='activities']").innerHTML = byNewest(siteContent.activities).slice(0, 3).map(({ item, index }) => `
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

  $("[data-list='home-projects']").innerHTML = visible.map((item, index) => `
    <button class="achievement-item" type="button" data-open-achievement="${achievementPage * pageSize + index}">
      <img src="${item.image}" alt="${ZH_SITE.escapeHtml(item.title)}">
      <figcaption>
        <strong>${ZH_SITE.escapeHtml(item.title)}</strong>
        <span>${ZH_SITE.escapeHtml(item.note || "成果展示")}</span>
      </figcaption>
    </button>
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

function chartLabels(items) {
  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0) || 1;
  let start = 0;
  return items.map((item, index) => {
    const value = Math.max(0, Number(item.value) || 0);
    const percent = value / total * 100;
    const mid = (start + percent / 2) / 100 * 360 - 90;
    start += percent;

    const rad = mid * Math.PI / 180;
    const side = Math.cos(rad) >= 0 ? "right" : "left";
    const labelX = 50 + Math.cos(rad) * 43;
    const labelY = 50 + Math.sin(rad) * 36;
    const lineX = 50 + Math.cos(rad) * 26;
    const lineY = 50 + Math.sin(rad) * 22;
    const width = Math.max(11, Math.abs(labelX - lineX));
    const angle = Math.atan2(labelY - lineY, labelX - lineX) * 180 / Math.PI;
    const clampedX = Math.min(88, Math.max(12, labelX));
    const clampedY = Math.min(84, Math.max(16, labelY));

    return `
      <span class="chart-label ${side}" style="left:${clampedX}%; top:${clampedY}%;">
        <i style="background:${item.color || chartColor(index)}"></i>${ZH_SITE.escapeHtml(item.label)} ${Math.round(percent)}%
      </span>
      <span class="chart-line" style="left:${lineX}%; top:${lineY}%; width:${width}%; transform:rotate(${angle}deg);"></span>
    `;
  }).join("");
}

function renderAboutCharts() {
  const root = $("[data-about-charts]");
  if (!root) return;
  const charts = (siteContent.about && siteContent.about.charts) || [];
  root.innerHTML = charts.map((chart, index) => {
    const items = chart.items || [];
    return `
      <article class="chart-card">
        <h3>${ZH_SITE.escapeHtml(chart.title)}</h3>
        <div class="pie-scene">
          <canvas class="pie-canvas" data-pie-index="${index}" aria-label="${ZH_SITE.escapeHtml(chart.title)}"></canvas>
          ${chartLabels(items)}
        </div>
      </article>
    `;
  }).join("");
  $$(".pie-canvas").forEach((canvas, index) => drawPieChart(canvas, charts[index].items || [], 1));
}

function shadeColor(color, amount) {
  const value = String(color || "#86aefb").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#6c91d8";
  const rgb = [0, 2, 4].map((offset) => Math.max(0, Math.min(255, parseInt(value.slice(offset, offset + 2), 16) + amount)));
  return `rgb(${rgb.join(",")})`;
}

function drawPieChart(canvas, items, progress) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  const values = items.map((item) => Math.max(0, Number(item.value) || 0));
  const total = values.reduce((sum, value) => sum + value, 0) || 1;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2 - 2;
  const radiusX = Math.min(rect.width * .31, 128);
  const radiusY = radiusX * .48;
  context.save();
  context.shadowColor = "rgba(27, 64, 112, .20)";
  context.shadowBlur = 12;
  context.shadowOffsetY = 7;
  context.beginPath(); context.ellipse(centerX, centerY + 3, radiusX * 1.02, radiusY * .98, 0, 0, Math.PI * 2); context.fillStyle = "rgba(50, 75, 115, .10)"; context.fill();
  context.restore();
  let start = -Math.PI / 2;
  const slices = values.map((value, index) => { const end = start + Math.PI * 2 * (value / total) * progress; const slice = { start, end, color: items[index].color || chartColor(index) }; start = end; return slice; });
  slices.forEach((slice) => {
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.ellipse(centerX, centerY, radiusX, radiusY, 0, slice.start, slice.end);
    context.closePath();
    context.fillStyle = slice.color;
    context.fill();
  });
}

function animatePieChart(canvas, items) {
  const startedAt = performance.now();
  const duration = 720;
  const frame = (timestamp) => {
    const elapsed = Math.min(1, (timestamp - startedAt) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    drawPieChart(canvas, items, Math.max(.04, eased));
    if (elapsed < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
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
  const charts = (siteContent.about && siteContent.about.charts) || [];
  $$(".pie-canvas").forEach((canvas, index) => animatePieChart(canvas, charts[index].items || []));
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

function renderAnnouncementsPage() {
  if (!document.body.matches("[data-page='announcements']")) return;
  $("[data-announcement-feed]").innerHTML = byNewest(siteContent.announcements).map(({ item, index }) => `
    <button class="activity-feed-item" type="button" data-open-detail="announcements" data-index="${index}">
      ${item.image ? `<img src="${item.image}" alt="${ZH_SITE.escapeHtml(item.title)}">` : ""}
      <div>
        <h2>${ZH_SITE.escapeHtml(item.title)}</h2>
        <p class="feed-meta"><span class="tag ${item.type || "info"}">${ZH_SITE.escapeHtml(item.tag || "通知")}</span> ${ZH_SITE.escapeHtml(item.date || "")}</p>
        <p>${ZH_SITE.escapeHtml(item.detail)}</p>
        ${item.link ? `<p style="margin-top:0.5rem;"><a href="${ZH_SITE.escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="color:var(--blue);font-weight:700;">查看相关链接 →</a></p>` : ""}
      </div>
    </button>
  `).join("");
}

function renderActivitiesPage() {
  if (!document.body.matches("[data-page='activities']")) return;
  $("[data-activity-feed]").innerHTML = byNewest(siteContent.activities).map(({ item, index }) => `
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
  const visualImage = join.visualImage && join.visualImage !== "assets/zhihang-logo.png" ? join.visualImage : siteContent.logo;
  const memberImages = (siteContent.memberProfiles || []).map((item) => item.image).filter(Boolean);
  const visibleMembers = memberImages.slice(0, 15);
  const hiddenMembers = memberImages.slice(15);
  const memberTiles = visibleMembers.map((image, index) => `
    <img class="join-member-avatar" src="${image}" alt="成员头像 ${index + 1}">
  `);
  if (hiddenMembers.length) {
    const stackImages = hiddenMembers.slice(0, 3);
    memberTiles.push(`
      <span class="join-member-more" aria-label="还有 ${hiddenMembers.length} 位成员">
        ${stackImages.map((image, index) => `<img src="${image}" alt="" style="--stack:${index}">`).join("")}
        <b>+${hiddenMembers.length}</b>
      </span>
    `);
  }
  $("[data-join-title]").textContent = join.title;
  $("[data-join-subtitle]").innerHTML = highlight(join.subtitle);
  $("[data-join-visual]").src = visualImage;
  $("[data-join-intro]").textContent = join.intro;
  $("[data-join-address]").textContent = join.address;
  $("[data-join-email]").textContent = join.email;
  $("[data-join-phone]").textContent = join.phone;
  $("[data-join-recruit-title]").textContent = join.recruitTitle;
  $("[data-join-recruit-info]").innerHTML = ZH_SITE.escapeHtml(join.recruitInfo).replace(/\n/g, "<br>");
  $("[data-join-members]").innerHTML = memberTiles.length ? memberTiles.join("") : `<span class="join-member-empty">成员头像将在这里展示</span>`;
}

function openDetail(type, index) {
  const item = siteContent[type][index];
  if (!item || !$("[data-detail-modal]")) return;
  const isActivity = type === "activities";
  const image = item.image ? `<img class="detail-image" src="${item.image}" alt="${ZH_SITE.escapeHtml(item.title)}">` : "";
  $("[data-detail-content]").innerHTML = `
    ${image}
    <div class="detail-kicker">${isActivity ? "近期活动" : "最新公告"}</div>
    <h2>${ZH_SITE.escapeHtml(item.title)}</h2>
    <div class="detail-meta">

      <span class="tag ${item.type || (isActivity ? "activity" : "info")}" style="display:inline-flex;padding:0 0.55rem;height:auto;line-height:1.8;">${ZH_SITE.escapeHtml(item.tag || (isActivity ? "活动" : "通知"))}</span>
      <span>${ZH_SITE.escapeHtml(item.date || "")}</span>
      ${isActivity ? `<span>${ZH_SITE.escapeHtml(item.place || "")}</span>` : ""}
    </div>
    <p>${ZH_SITE.escapeHtml(item.detail || "暂无详情。")}</p>
    ${isActivity ? "" : (item.link ? `<p><a href="${ZH_SITE.escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--blue);font-weight:700;">查看相关链接 →</a></p>` : "")}
  `;
  $("[data-detail-modal]").hidden = false;
}

function openAchievement(index) {
  const item = (siteContent.achievements || [])[index];
  if (!item || !$("[data-detail-modal]")) return;
  $("[data-detail-content]").innerHTML = `
    <img class="detail-image achievement-detail-image" src="${item.image}" alt="${ZH_SITE.escapeHtml(item.title)}">
    <div class="detail-kicker">成果展示</div>
    <h2>${ZH_SITE.escapeHtml(item.title)}</h2>
    <p>${ZH_SITE.escapeHtml(item.note || "暂无说明。")}</p>
  `;
  $("[data-detail-modal]").hidden = false;
}

function openList(type) {
  if (!$("[data-detail-modal]")) return;
  const title = type === "activities" ? "近期活动" : "最新公告";
  const items = ["announcements", "activities"].includes(type) ? byNewest(siteContent[type]) : (siteContent[type] || []).map((item, index) => ({ item, index }));
  $("[data-detail-content]").innerHTML = `
    <div class="detail-kicker">全部内容</div>
    <h2>${title}</h2>
    <div class="detail-list">
      ${items.map(({ item, index }) => `
        <button type="button" data-open-detail="${type}" data-index="${index}">
          <strong>${ZH_SITE.escapeHtml(item.title)}</strong>
          <span><span class="tag ${item.type || "info"}" style="display:inline-flex;padding:0 0.45rem;height:1.6rem;font-size:0.82rem;">${ZH_SITE.escapeHtml(item.tag || (type === "activities" ? "活动" : "通知"))}</span> ${ZH_SITE.escapeHtml(item.date || "")}${type === "activities" ? ` · ${ZH_SITE.escapeHtml(item.place || "")}` : ""}</span>
        </button>
      `).join("")}
    </div>
  `;
  $("[data-detail-modal]").hidden = false;
}

function closeDetail() {
  if ($("[data-detail-modal]")) $("[data-detail-modal]").hidden = true;
}

function bindEvents() {
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
  document.addEventListener("click", (event) => {
    const detailButton = event.target.closest("[data-open-detail]");
    if (detailButton) {
      openDetail(detailButton.dataset.openDetail, Number(detailButton.dataset.index));
      return;
    }

    const achievementButton = event.target.closest("[data-open-achievement]");
    if (achievementButton) {
      openAchievement(Number(achievementButton.dataset.openAchievement));
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
  renderAnnouncementsPage();
  renderActivitiesPage();
  renderJoin();
}

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
