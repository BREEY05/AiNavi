if (sessionStorage.getItem("zhihang-admin-auth") !== "1") {
  window.location.href = "index.html";
}

let data = ZH_SITE.load();
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const titles = {
  basic: "基础与Logo",
  home: "首页内容",
  achievements: "成果照片",
  announcements: "最新公告",
  about: "关于我们",
  members: "社团风采",
  projects: "项目展示",
  activities: "近期活动",
  join: "加入我们"
};

function applyTheme() {
  document.documentElement.style.setProperty("--blue", data.themeColor || "#1768ff");
  $("[data-admin-logo]").style.backgroundImage = `url("${data.logo}")`;
  $("[data-preview-logo]").style.backgroundImage = `url("${data.logo}")`;
  $("[data-preview-hero]").src = data.heroImage;
  $("[data-preview-about]").src = data.about.image;
}

function fillForms() {
  if (!Array.isArray(data.achievements)) data.achievements = [];
  const basic = $("[data-panel='basic']");
  basic.elements.siteName.value = data.siteName;
  basic.elements.themeColor.value = data.themeColor || "#1768ff";

  const home = $("[data-panel='home']");
  home.elements.heroTitle.value = data.heroTitle;
  home.elements.heroSubtitle.value = data.heroSubtitle;
  home.elements.heroLine.value = data.heroLine;
  home.elements.clubIntro.value = data.clubIntro;

  const about = $("[data-panel='about']");
  about.elements.title.value = data.about.title;
  about.elements.subtitle.value = data.about.subtitle;
  about.elements.missionTitle.value = data.about.missionTitle;

  const join = $("[data-panel='join']");
  Object.keys(data.join).forEach((key) => {
    if (join.elements[key]) join.elements[key].value = data.join[key];
  });
}

function renderEditors() {
  if (!Array.isArray(data.achievements)) data.achievements = [];
  ensureAboutCharts();
  renderEditor("features");
  renderEditor("achievements");
  renderEditor("announcements");
  renderEditor("aboutParagraphs");
  renderEditor("aboutStats");
  renderEditor("majorChart");
  renderEditor("gradeChart");
  renderEditor("memberProfiles");
  renderEditor("clubMoments");
  renderEditor("projects");
  renderEditor("activities");
}

function renderEditor(type) {
  const root = $(`[data-editor='${type}']`);
  if (!root) return;
  const items = getItems(type);
  root.innerHTML = items.map((item, index) => card(type, item, index)).join("");
}

function getItems(type) {
  if (type === "aboutParagraphs") return data.about.paragraphs.map((text) => ({ text }));
  if (type === "aboutStats") return data.about.stats;
  if (type === "majorChart") return (data.about.charts && data.about.charts[0] && data.about.charts[0].items) || [];
  if (type === "gradeChart") return (data.about.charts && data.about.charts[1] && data.about.charts[1].items) || [];
  return data[type] || [];
}

function card(type, item, index) {
  const draggable = ["achievements", "memberProfiles", "clubMoments", "projects", "activities", "majorChart", "gradeChart"].includes(type);
  const removeable = !["features", "aboutParagraphs", "aboutStats"].includes(type);
  const body = {
    features: `
      <div class="editor-grid">
        ${select("线性图标", "icon", item.icon, [["book", "书本"], ["project", "项目"], ["trophy", "奖杯"], ["idea", "灯泡"]])}
        ${field("标题", "title", item.title)}
      </div>
    `,
    announcements: `
      <div class="editor-grid">
        ${field("标签", "tag", item.tag)}
        ${select("类型", "type", item.type, [["info", "通知蓝"], ["activity", "活动绿"], ["competition", "竞赛橙"], ["share", "分享紫"]])}
        ${field("公告标题", "title", item.title, "full")}
        ${field("日期", "date", item.date)}
        ${textarea("公告详情", "detail", item.detail)}
      </div>
    `,
    aboutParagraphs: textarea("段落", "text", item.text),
    aboutStats: `
      <div class="editor-grid">
        ${field("数字", "value", item.value)}
        ${field("说明", "label", item.label)}
      </div>
    `,
    majorChart: `
      <div class="editor-grid">
        ${field("分布名称", "label", item.label)}
        ${field("人数/占比数值", "value", item.value)}
        ${field("颜色", "color", item.color)}
      </div>
    `,
    gradeChart: `
      <div class="editor-grid">
        ${field("分布名称", "label", item.label)}
        ${field("人数/占比数值", "value", item.value)}
        ${field("颜色", "color", item.color)}
      </div>
    `,
    achievements: `
      <div class="editor-grid">
        ${field("照片标题", "title", item.title, "full")}
        ${field("备注", "note", item.note)}
        ${imageInput("成果照片", "image")}
      </div>
      <img class="thumb-preview" src="${item.image}" alt="成果照片预览">
    `,
    memberProfiles: `
      <div class="editor-grid">
        ${field("姓名/展示名", "name", item.name)}
        ${field("头衔/职称", "title", item.title)}
        ${textarea("获奖情况", "awards", item.awards)}
        ${imageInput("头像", "image")}
      </div>
      <img class="thumb-preview avatar-preview" src="${item.image}" alt="成员头像预览">
    `,
    clubMoments: `
      <div class="editor-grid">
        ${field("风采标题", "title", item.title)}
        ${textarea("照片文字", "text", item.text)}
        ${imageInput("活动照片", "image")}
      </div>
      <img class="thumb-preview" src="${item.image}" alt="活动风采预览">
    `,
    projects: `
      <div class="editor-grid">
        ${field("项目标题", "title", item.title, "full")}
        ${field("分类", "category", item.category)}
        ${field("获得奖项", "award", item.award)}
        ${textarea("项目介绍", "detail", item.detail)}
        ${imageInput("项目图片", "image")}
      </div>
      <img class="thumb-preview" src="${item.image}" alt="项目预览">
    `,
    activities: `
      <div class="editor-grid">
        ${field("活动标题", "title", item.title, "full")}
        ${field("时间", "date", item.date)}
        ${field("地点", "place", item.place)}
        ${textarea("活动详情", "detail", item.detail)}
        ${imageInput("活动图片", "image")}
      </div>
      <img class="thumb-preview" src="${item.image}" alt="活动图片预览">
    `
  }[type];

  return `
    <section class="editor-card" ${draggable ? "draggable='true'" : ""} data-type="${type}" data-index="${index}">
      <div class="editor-card-head">
        <span>${draggable ? "↕ " : ""}${index + 1}. ${labelName(type)}</span>
        ${removeable ? `<button class="danger-button" type="button" data-remove="${type}" data-index="${index}">删除</button>` : ""}
      </div>
      ${body}
    </section>
  `;
}

function labelName(type) {
  return {
    features: "首页介绍图标",
    announcements: "公告",
    achievements: "成果照片",
    aboutParagraphs: "关于我们段落",
    aboutStats: "统计卡片",
    majorChart: "专业分布",
    gradeChart: "年级分布",
    memberProfiles: "成员介绍",
    clubMoments: "活动风采",
    projects: "项目",
    activities: "活动"
  }[type];
}

function field(label, name, value, extra = "") {
  return `<label class="${extra}">${label}<input name="${name}" type="text" value="${ZH_SITE.escapeHtml(value)}"></label>`;
}

function textarea(label, name, value) {
  return `<label class="full">${label}<textarea name="${name}" rows="4">${ZH_SITE.escapeHtml(value)}</textarea></label>`;
}

function imageInput(label, name) {
  return `<label class="full">${label}<input name="${name}" type="file" accept="image/*"></label>`;
}

function select(label, name, value, options) {
  return `
    <label>${label}
      <select name="${name}">
        ${options.map(([val, text]) => `<option value="${val}" ${value === val ? "selected" : ""}>${text}</option>`).join("")}
      </select>
    </label>
  `;
}

async function collect(type) {
  const cards = $$(`[data-editor='${type}'] .editor-card`);
  return Promise.all(cards.map(async (node) => {
    const original = getOriginal(type, Number(node.dataset.index));
    const item = { ...original };
    $$("input[type='text'], textarea, select", node).forEach((input) => {
      item[input.name] = input.value.trim();
    });
    const fileInput = $("input[type='file']", node);
    if (fileInput && fileInput.files[0]) item.image = await ZH_SITE.uploadImage(fileInput.files[0]);
    return item;
  }));
}

function getOriginal(type, index) {
  if (type === "aboutParagraphs") return { text: data.about.paragraphs[index] || "" };
  if (type === "aboutStats") return data.about.stats[index] || {};
  if (type === "majorChart") return getItems("majorChart")[index] || {};
  if (type === "gradeChart") return getItems("gradeChart")[index] || {};
  return (data[type] || [])[index] || {};
}

function ensureAboutCharts() {
  if (!data.about.charts) {
    data.about.charts = [
      { title: "成员专业分布图", items: [] },
      { title: "成员年级分布图", items: [] }
    ];
  }
  if (!data.about.charts[0]) data.about.charts[0] = { title: "成员专业分布图", items: [] };
  if (!data.about.charts[1]) data.about.charts[1] = { title: "成员年级分布图", items: [] };
  if (!Array.isArray(data.about.charts[0].items)) data.about.charts[0].items = [];
  if (!Array.isArray(data.about.charts[1].items)) data.about.charts[1].items = [];
}

async function save(message = "已保存") {
  try {
    data = await ZH_SITE.save(data);
    applyTheme();
    showState(message);
  } catch (error) {
    console.error("Failed to save site content:", error);
    showState("保存失败，请检查服务端");
  }
}

function showState(message) {
  const node = $("[data-save-state]");
  node.textContent = message;
  window.setTimeout(() => { node.textContent = ""; }, 1600);
}

function switchPanel(name) {
  $$("[data-section]").forEach((button) => button.classList.toggle("active", button.dataset.section === name));
  $$("[data-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
  $("[data-admin-title]").textContent = titles[name];
}

function newItem(type) {
  const map = {
    announcements: { tag: "通知", type: "info", title: "新的公告标题", date: "05-30", detail: "这里填写公告详情。" },
    achievements: { title: "新的成果照片", note: "照片展示", image: ZH_SITE.placeholder("成果照片", "#1768ff") },
    majorChart: { label: "新专业", value: 10, color: "#1768ff" },
    gradeChart: { label: "新年级", value: 10, color: "#1768ff" },
    memberProfiles: { name: "新成员", title: "自定义头衔/职称", awards: "这里填写获奖情况。", image: ZH_SITE.placeholder("成员头像", "#1768ff") },
    clubMoments: { title: "新的活动风采", text: "这里填写活动照片下方文字。", image: ZH_SITE.placeholder("活动风采", "#19a680") },
    projects: { title: "新的项目", category: "项目分类", award: "填写获得的奖项", image: ZH_SITE.placeholder("项目图片", "#0aa878"), detail: "这里填写项目介绍。" },
    activities: { title: "新的活动标题", date: "05-30 19:00", place: "待定", image: ZH_SITE.placeholder("新的活动", "#1768ff"), detail: "这里填写活动详情。" }
  };
  return map[type];
}

function moveItem(type, from, to) {
  const list = getItems(type);
  if (!list || from === to || to < 0 || to >= list.length) return;
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
  renderEditor(type);
}

function bindDrag() {
  document.addEventListener("dragstart", (event) => {
    const card = event.target.closest(".editor-card[draggable='true']");
    if (!card) return;
    event.dataTransfer.setData("text/plain", `${card.dataset.type}:${card.dataset.index}`);
  });
  document.addEventListener("dragover", (event) => {
    if (event.target.closest(".editor-card[draggable='true']")) event.preventDefault();
  });
  document.addEventListener("drop", (event) => {
    const card = event.target.closest(".editor-card[draggable='true']");
    if (!card) return;
    event.preventDefault();
    const [type, from] = event.dataTransfer.getData("text/plain").split(":");
    if (type === card.dataset.type) moveItem(type, Number(from), Number(card.dataset.index));
  });
}

function bind() {
  $$("[data-section]").forEach((button) => button.addEventListener("click", () => switchPanel(button.dataset.section)));
  $("[data-preview]").addEventListener("click", () => { window.location.href = "index.html"; });
  $("[data-logout]").addEventListener("click", () => {
    sessionStorage.removeItem("zhihang-admin-auth");
    window.location.href = "index.html";
  });

  $("[data-panel='basic']").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    data.siteName = form.elements.siteName.value.trim();
    data.themeColor = form.elements.themeColor.value || "#1768ff";
    if (form.elements.logo.files[0]) {
      data.logo = await ZH_SITE.uploadImage(form.elements.logo.files[0]);
      form.elements.logo.value = "";
    }
    await save();
  });

  $("[data-panel='home']").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    data.heroTitle = form.elements.heroTitle.value.trim();
    data.heroSubtitle = form.elements.heroSubtitle.value.trim();
    data.heroLine = form.elements.heroLine.value.trim();
    data.clubIntro = form.elements.clubIntro.value.trim();
    data.features = await collect("features");
    if (form.elements.heroImage.files[0]) {
      data.heroImage = await ZH_SITE.uploadImage(form.elements.heroImage.files[0]);
      form.elements.heroImage.value = "";
    }
    await save();
    renderEditor("features");
  });

  $("[data-panel='announcements']").addEventListener("submit", async (event) => {
    event.preventDefault();
    data.announcements = await collect("announcements");
    await save();
    renderEditor("announcements");
  });

  $("[data-panel='about']").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    data.about.title = form.elements.title.value.trim();
    data.about.subtitle = form.elements.subtitle.value.trim();
    data.about.missionTitle = form.elements.missionTitle.value.trim();
    data.about.paragraphs = (await collect("aboutParagraphs")).map((item) => item.text);
    data.about.stats = await collect("aboutStats");
    ensureAboutCharts();
    data.about.charts[0].items = await collect("majorChart");
    data.about.charts[1].items = await collect("gradeChart");
    if (form.elements.image.files[0]) {
      data.about.image = await ZH_SITE.uploadImage(form.elements.image.files[0]);
      form.elements.image.value = "";
    }
    await save();
    renderEditor("majorChart");
    renderEditor("gradeChart");
  });

  $("[data-panel='achievements']").addEventListener("submit", async (event) => {
    event.preventDefault();
    data.achievements = await collect("achievements");
    await save();
    renderEditor("achievements");
  });

  $("[data-panel='members']").addEventListener("submit", async (event) => {
    event.preventDefault();
    data.memberProfiles = await collect("memberProfiles");
    data.clubMoments = await collect("clubMoments");
    await save();
    renderEditor("memberProfiles");
    renderEditor("clubMoments");
  });

  $("[data-panel='projects']").addEventListener("submit", async (event) => {
    event.preventDefault();
    data.projects = await collect("projects");
    await save();
    renderEditor("projects");
  });

  $("[data-panel='activities']").addEventListener("submit", async (event) => {
    event.preventDefault();
    data.activities = await collect("activities");
    await save();
    renderEditor("activities");
  });

  $("[data-panel='join']").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    Object.keys(data.join).forEach((key) => {
      if (form.elements[key]) data.join[key] = form.elements[key].value.trim();
    });
    await save();
  });

  document.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add]");
    if (add) {
      const list = getItems(add.dataset.add);
      list.push(newItem(add.dataset.add));
      renderEditor(add.dataset.add);
    }
    const remove = event.target.closest("[data-remove]");
    if (remove) {
      getItems(remove.dataset.remove).splice(Number(remove.dataset.index), 1);
      renderEditor(remove.dataset.remove);
    }
  });

  $("[data-export]").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zhihang-ai-content.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  $("[data-reset]").addEventListener("click", async () => {
    if (!confirm("确定恢复默认内容吗？当前浏览器保存的修改会被清除。")) return;
    data = await ZH_SITE.reset();
    applyTheme();
    fillForms();
    renderEditors();
    showState("已恢复默认");
  });

  bindDrag();
}

applyTheme();
fillForms();
renderEditors();
bind();

ZH_SITE.fetchContent()
  .then((content) => {
    data = content;
    applyTheme();
    fillForms();
    renderEditors();
  })
  .catch((error) => {
    console.error("Failed to refresh site content:", error);
    showState("读取数据库失败，当前显示默认内容");
  });
