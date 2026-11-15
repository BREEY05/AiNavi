# 智航AI协会网站

协会网站采用天穹观测台视觉设计，内容由原有 Express / SQLite 后台管理。请通过 Node.js 服务访问；新版页面需要 `/api/content`，不能仅用静态文件服务器预览。

## 页面结构

- `index.html`：首页
- `about.html`：关于我们
- `members.html`：社团风采
- `projects.html`：项目展示
- `activities.html`：近期活动
- `announcements.html`：最新公告
- `login.html`：管理员登录与注册入口
- `join.html`：加入我们
- `admin.html`：内部管理后台

## 资源与脚本

- `styles.css`：前台公共样式
- `admin.css`：后台样式
- `site-data.js`：默认内容与前台数据工具
- `main.js`：前台渲染、详情弹窗、Canvas 分布图
- `auth.js` / `auth.css`：管理员登录注册页
- `admin.js`：后台编辑、上传、保存、排序
- `demo.css` / `story.css` / `phase2.css`：首页、关于我们、社团风采与加入我们页面的视觉样式
- `demo.js` / `story.js` / `phase2.js` / `join-halo.js`：粒子、章节导航、成果拨盘和招新入场动效
- `global-nav.*` / `navigation-motion.js`：公共导航与跨页转场
- `redesign-content.mjs` / `content-schema.mjs`：内容读取、运行时校验和新版页面渲染
- `demo-logo.svg`：随代码提供的默认标识，可在后台上传替换

首页展示最新四条公告和三场活动，并链接到完整列表；成果拨盘包含后台配置的成果照片与项目。`projects.html`、`activities.html`、`announcements.html` 保留独立访问入口。首页工程插画与加入页光环为固定设计；后台上传的首页图片从页脚“协会影像”查看，招新主视觉图显示在加入页的欢迎区域。后台内容读取失败时页面显示明确错误，不展示过期的演示内容。

## 管理员认证

右上角 Logo 仅保留视觉样式，不再触发登录。管理员从 `login.html` 进入，使用 QQ 号、用户自定义密码和邮箱验证码完成登录。

新账号默认处于“待审批”状态；使用 `ADMIN_QQ` 注册的账号会成为所有者，并可在后台“账号管理”中批准、待定或禁用其他账号。

验证码邮件默认使用控制台模式，正式发送 QQ 邮件前复制 `.env.example` 为 `.env`，填写 QQ 邮箱 SMTP 授权码：

```text
ADMIN_QQ=380154843
MAIL_MODE=smtp
QQ_MAIL_USER=380154843@qq.com
QQ_MAIL_AUTH_CODE=QQ邮箱SMTP授权码
```

邮件验证码有效期为 10 分钟，同一 QQ 号每 60 秒最多发送一次，同一 IP 每小时最多发送 5 次。

## 后台可配置

- 基础 Logo、协会名称、主题色
- 首页主视觉、标题、介绍、公告
- 关于我们页面文案、图片、统计卡片
- 社团风采：成员介绍（头像、头衔/职称、获奖情况）和活动风采（照片、文字），支持新增、删除、拖拽排序
- 项目展示图片、标题、分类、获得奖项、说明，支持新增、删除、拖拽排序
- 近期活动图片、标题、时间、地点、详情，支持新增、删除、拖拽排序
- 加入我们页面联系信息、招新信息、说明文案

内容和管理员账号均保存于 SQLite；`data/` 与 `.env` 不应提交到代码仓库。

## 上线部署

推荐 Node.js 22 LTS（本次验证使用 22.23.5）。原有 `better-sqlite3` 11.x 在 Windows / Node.js 24 下没有对应预编译包；本次保持生产依赖不变。

运行 `npm ci` 安装锁定依赖，再运行 `npm start`，访问 `http://localhost:3000`。部署时保留 `server.js`、`site-data.js`、所有 HTML/CSS/JS/MJS/SVG 资源、`package.json` 与 `package-lock.json`，并按原有方式持久化 `data/` 和 `uploads/`。生产环境可以使用 `npm ci --omit=dev`。

## 验证

`npm run typecheck` 对新增内容适配模块执行严格类型检查。`npm test` 使用已安装的 Google Chrome、真实 Express 服务与临时 SQLite 数据库，覆盖页面导航、详情弹窗、注册登录、上传与后台保存、内容增删、空列表、无效数据提示，以及 1440px / 390px 视口和减少动态效果设置。验证码使用控制台模式，不发送邮件；测试不读取生产数据库。截图输出到 Git 忽略的 `tmp-verification/`。
