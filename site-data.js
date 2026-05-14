const ZH_SITE = (() => {
  const STORAGE_KEY = "zhihang-ai-content-v3";
  const LOGIN_CODE_PRIMARY = "heyiwei";
  const LOGIN_CODE_SECONDARY = "qnmd";

  function svgData(markup) {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markup)}`;
  }

  function placeholder(title, color = "#1768ff") {
    return svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
        <defs>
          <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="${color}"/>
            <stop offset="1" stop-color="#102f74"/>
          </linearGradient>
          <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M42 0H0V42" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="960" height="540" fill="url(#bg)"/>
        <rect width="960" height="540" fill="url(#grid)"/>
        <circle cx="760" cy="120" r="150" fill="rgba(255,255,255,.14)"/>
        <text x="72" y="280" fill="#fff" font-family="Microsoft YaHei, Arial, sans-serif" font-size="54" font-weight="700">${title}</text>
        <text x="76" y="340" fill="rgba(255,255,255,.82)" font-family="Microsoft YaHei, Arial, sans-serif" font-size="24">智航AI协会 · 图片占位</text>
      </svg>
    `);
  }

  function defaultLogo() {
    return svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
        <rect width="96" height="96" rx="16" fill="#fff"/>
        <circle cx="48" cy="39" r="24" fill="none" stroke="#1269ff" stroke-width="6"/>
        <path d="M25 43c17-8 34-9 53-3" fill="none" stroke="#1269ff" stroke-width="5" stroke-linecap="round"/>
        <path d="M22 52c20 6 38 3 58-7" fill="none" stroke="#15a5ff" stroke-width="5" stroke-linecap="round"/>
        <text x="48" y="78" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="12" font-weight="700">AI</text>
      </svg>
    `);
  }

  const defaults = {
    siteName: "智航AI协会",
    logo: "assets/zhihang-logo.png",
    themeColor: "#1768ff",
    heroTitle: "智航AI协会",
    heroSubtitle: "探索人工智能的无限可能",
    heroLine: "学习 · 实践 · 分享 · 成长",
    heroImage: placeholder("协会主视觉", "#8bc4ff"),
    clubIntro: "智航AI协会是一个专注于人工智能领域学习、研究与实践的学生社团。我们致力于搭建学术交流平台，组织技术分享、项目实践、竞赛培训等活动，帮助成员提升专业能力，探索AI技术的无限可能。",
    features: [
      { icon: "book", title: "学术交流" },
      { icon: "project", title: "项目实践" },
      { icon: "trophy", title: "竞赛培训" },
      { icon: "idea", title: "创新探索" }
    ],
    achievements: [
      { title: "成果照片一", image: placeholder("成果照片一", "#1768ff"), note: "照片展示" },
      { title: "成果照片二", image: placeholder("成果照片二", "#0aa878"), note: "照片展示" },
      { title: "成果照片三", image: placeholder("成果照片三", "#705cff"), note: "照片展示" }
    ],
    announcements: [
      { tag: "通知", type: "info", title: "智航AI协会例会通知（第12周）", date: "05-20", detail: "本周例会将围绕近期项目进度、技术分享安排和成员分组进行说明，请各位成员准时参加。" },
      { tag: "活动", type: "activity", title: "【技术分享会】大模型在实际项目中的应用", date: "05-18", detail: "本次分享会将结合真实项目案例，介绍大模型调用、提示词设计、知识库应用与落地流程。" },
      { tag: "竞赛", type: "competition", title: "校内AI算法大赛即将开启，欢迎报名！", date: "05-15", detail: "校内AI算法大赛报名即将开始，协会将组织赛前培训、组队匹配和资料分享。" },
      { tag: "分享", type: "share", title: "机器学习前沿技术分享回顾", date: "05-08", detail: "本次回顾整理了前沿模型、学习路线和实践建议，便于成员课后继续学习。" }
    ],
    about: {
      title: "关于我们",
      subtitle: "智航AI协会致力于推动校园人工智能技术发展，为同学们提供学习交流平台",
      image: placeholder("关于我们", "#6fb6ff"),
      missionTitle: "我们的使命",
      paragraphs: [
        "智航AI协会成立于2023年，是一个专注于人工智能技术研究与应用的学生社团。我们致力于为对AI技术感兴趣的同学提供一个学习、交流和实践的平台。",
        "协会定期举办技术讲座、编程竞赛、项目实战等活动，帮助成员提升技术水平，培养创新思维和团队协作能力。"
      ],
      stats: [
        { value: "50+", label: "活跃成员" },
        { value: "12", label: "技术项目" }
      ],
      charts: [
        {
          title: "成员专业分布图",
          items: [
            { label: "计算机类", value: 38, color: "#1768ff" },
            { label: "人工智能", value: 28, color: "#19a680" },
            { label: "软件工程", value: 20, color: "#f18423" },
            { label: "其他专业", value: 14, color: "#8561ec" }
          ]
        },
        {
          title: "成员年级分布图",
          items: [
            { label: "大一", value: 24, color: "#1768ff" },
            { label: "大二", value: 36, color: "#19a680" },
            { label: "大三", value: 28, color: "#f18423" },
            { label: "大四", value: 12, color: "#8561ec" }
          ]
        }
      ]
    },
    memberProfiles: [
      { name: "张同学", title: "算法组负责人", awards: "校级AI算法大赛一等奖；数学建模校赛二等奖", image: placeholder("成员头像", "#1768ff") },
      { name: "李同学", title: "项目开发负责人", awards: "大学生创新创业训练计划立项；优秀社团骨干", image: placeholder("成员头像", "#19a680") },
      { name: "王同学", title: "视觉与运营负责人", awards: "科技文化节优秀作品奖；社团宣传优秀个人", image: placeholder("成员头像", "#ff9b32") }
    ],
    clubMoments: [
      { title: "技术分享现场", text: "成员围绕大模型应用进行分享交流。", image: placeholder("活动风采", "#1768ff") },
      { title: "项目实践讨论", text: "项目组成员共同推进智能应用开发。", image: placeholder("活动风采", "#19a680") },
      { title: "竞赛训练营", text: "协会组织算法竞赛训练与赛题复盘。", image: placeholder("活动风采", "#705cff") }
    ],
    projects: [
      { title: "校园智能问答助手", category: "大模型应用", award: "校级AI创新赛一等奖", image: placeholder("校园智能问答助手", "#1768ff"), detail: "基于知识库和大模型能力，为校园学习、社团活动与常见事务提供智能问答支持。" },
      { title: "数据分析可视化平台", category: "数据智能", award: "数据建模挑战赛二等奖", image: placeholder("数据分析可视化平台", "#0aa878"), detail: "面向社团项目和课程实践，沉淀数据清洗、建模分析和可视化展示能力。" },
      { title: "机器学习竞赛训练包", category: "竞赛训练", award: "算法实践作品优秀奖", image: placeholder("机器学习竞赛训练包", "#705cff"), detail: "整理常用算法模板、特征工程方法和赛题复盘，帮助成员快速进入竞赛状态。" }
    ],
    activities: [
      { title: "技术分享会：大模型在实际项目中的应用", date: "05-18 14:00", place: "教二 301", image: placeholder("技术分享会", "#1768ff"), detail: "面向有基础的同学，讲解大模型在课程项目、智能问答和数据分析中的实际应用。" },
      { title: "机器学习算法工作坊", date: "05-25 15:00", place: "实验楼 204", image: placeholder("算法工作坊", "#244bd2"), detail: "通过实操方式复习常用机器学习算法，并完成一个小型预测任务。" },
      { title: "社团例会（第12周）", date: "05-21 19:00", place: "教二 302", image: placeholder("社团例会", "#0aa878"), detail: "同步协会近期安排、项目组进度和后续活动计划。" }
    ],
    join: {
      title: "加入我们",
      subtitle: "欢迎加入智航AI协会，与我们一起探索人工智能的无限可能",
      address: "学校计算机学院 A 栋 301 室",
      email: "info@zhihangai.org",
      phone: "010-12345678",
      intro: "智航AI协会欢迎所有对人工智能技术感兴趣的同学加入，无论你是初学者还是有一定基础的技术爱好者，都能在这里找到属于自己的位置。",
      recruitTitle: "招新时间",
      recruitInfo: "秋季学期：9月-10月\n春季学期：3月-4月"
    }
  };

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

  let cache = clone(defaults);

  function load() {
    return clone(cache);
  }

  async function fetchContent() {
    const response = await fetch("/api/content", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load site content");
    const remote = await response.json();
    cache = merge(clone(defaults), remote);
    return load();
  }

  async function save(data) {
    cache = merge(clone(defaults), data);
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cache)
    });
    if (!response.ok) throw new Error("Failed to save site content");
    const remote = await response.json();
    cache = merge(clone(defaults), remote);
    return load();
  }

  async function reset() {
    return save(clone(defaults));
  }

  async function uploadImage(file) {
    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    if (!response.ok) throw new Error("Failed to upload image");

    const result = await response.json();
    if (!result.url) throw new Error("Upload response missing image URL");
    return result.url;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function icon(name) {
    const icons = {
      book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H20v17H8.5A3.5 3.5 0 0 0 5 22Z"/><path d="M5 5.5V22M9 6h7"/></svg>',
      project: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4Z"/><path d="M8 9h4M8 13h8M15 9h1"/></svg>',
      trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4a4 4 0 0 1-8 0Z"/><path d="M8 6H4a4 4 0 0 0 4 4M16 6h4a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"/></svg>',
      idea: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1 1-1.5 2-1.5 4h-5c0-2-.5-3-1.5-4Z"/></svg>'
    };
    return icons[name] || icons.book;
  }

  return { LOGIN_CODE_PRIMARY, LOGIN_CODE_SECONDARY, defaults, load, fetchContent, save, reset, uploadImage, fileToDataUrl, escapeHtml, icon, placeholder };
})();
