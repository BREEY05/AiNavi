# 智航AI协会网站

这是协会网站，可直接上传到服务器网站根目录访问。

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
- `assets/`：默认 Logo 与参考图资源

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

需要 Node.js 20 或更高版本。安装依赖后运行 `npm start`，并同时部署 `server.js`、所有页面资源、`package.json`、`package-lock.json` 与 `assets/`。
