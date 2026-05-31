<p align="center">
  <img src="https://img.shields.io/badge/Version-6.5.0-blue?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Language-JavaScript-yellow?style=for-the-badge" alt="Language">
  <img src="https://img.shields.io/badge/Platform-Web-orange?style=for-the-badge" alt="Platform">
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge" alt="PRs">
</p>

<h1 align="center">🃏 MedCard Duel 医学刷题工坊</h1>

<p align="center">
  <strong>三国杀机制 × 医学题库 — 用卡牌对战高效刷题，让背书像打牌一样上瘾</strong>
</p>

<p align="center">
  <a href="#-本地电脑-vs-code-开发完整教程">💻 本地开发</a> ·
  <a href="#-云服务器部署--迁移完整教程">🚀 服务器部署</a> ·
  <a href="#-私有题库数据迁移方案">📦 私有题库迁移</a> ·
  <a href="#-音视频教程专区">🎧 视频教程</a>
</p>

---

## 📖 项目简介

**MedCard Duel（医学刷题工坊）** 是一款基于浏览器的医学知识卡牌对战游戏。核心玩法借鉴三国杀回合制卡牌机制，**所有卡牌效果的判定通过答题实现**——答对生效，答错作废。将枯燥的医学题库变成刺激的策略对战，让复习变成一种期待。

### ✨ 核心亮点

| 模块 | 功能 |
|------|------|
| 🃏 **卡牌对战** | 120+ 张医学主题卡牌（攻击/防御/治疗/锦囊/装备），2~5 人身份局（主公/忠臣/反贼/内奸） |
| 📝 **刷题工坊** | 独立刷题模式，6 种治愈系主题皮肤，慢速/快速/计时三种答题模式 |
| 🧠 **快学模式** | 基于 12 项认知科学理论的智能间隔重复系统，6 级记忆模型 + 错误基因分类 |
| 📂 **章节筛选** | 87 个章节级别的精细选题，按科目+章节自由组合刷题范围 |
| 📒 **错题本** | 错题自动收集、书签标记、自测模式、逐题解析与干扰项分析 |
| 🎨 **6 套主题** | 夜学/樱花/露营/猫咖/海边/极简，每套独立配色与动态背景 |
| 🌐 **跨平台** | 纯网页端，手机/平板/电脑均可访问，PWA 离线可用 |
| 🔗 **多人联机** | WebRTC P2P + WebSocket 中继，输入 6 位房间号即加入对战 |
| ⚡ **性能优化** | 56 个 JS 模块 → 1 个 bundle.js，22 个 CSS → 内联 `<style>`，2 次 HTTP 请求加载完毕 |
| ☁️ **Cloudflare Pages** | 纯静态部署，全球 CDN 加速，零服务器成本 |

---

## 📸 项目效果预览

> 截图存放目录：`screenshots/` （请将实际截图放入该目录后替换下方占位链接）

| 首页大厅 | 刷题界面 | 错题管理 |
|:---:|:---:|:---:|
| ![首页](screenshots/title.png) | ![刷题](screenshots/study.png) | ![错题](screenshots/notebook.png) |

| 卡牌对战 | 章节选择 | 快学仪表盘 |
|:---:|:---:|:---:|
| ![对战](screenshots/battle.png) | ![章节](screenshots/chapters.png) | ![快学](screenshots/fastlearn.png) |

> 💡 **截图技巧**：推荐使用 [PicGo](https://picgo.github.io/) + GitHub 图床，截图后自动生成 Markdown 图片链接。

---

## 🎧 音视频教程专区

### 📻 配套音频讲解

我们录制了 **3 分钟语音讲解**，快速了解项目全貌与上手流程：

- 🎙️ [音频讲解 MP3 下载](https://pan.baidu.com/s/你的分享链接)（百度网盘）
- 📄 [音频文字稿](#附音频文字稿)（见本文末尾附录）

### 📺 实操短视频教程

**10 分钟完整实操视频**，手把手带你从零搭建：

| 章节 | 时长 | 内容 |
|------|------|------|
| ① 项目介绍 | 1 min | 功能概览、界面导览 |
| ② 本地 VS Code 开发 | 4 min | 克隆仓库 → 安装依赖 → 导入题库 → 启动调试 |
| ③ 服务器部署 | 3 min | 新服务器环境配置 → 一键部署脚本 |
| ④ 私有题库迁移 | 2 min | 旧服务器打包 → 下载 → 新服务器还原 |

- 🎬 [B站教程视频](https://www.bilibili.com/video/你的视频ID)
- 📥 [视频源文件下载](https://pan.baidu.com/s/你的分享链接)（百度网盘备用）
- 📄 [视频拍摄脚本](#附实操短视频拍摄脚本)（见本文末尾附录）

> 🎤 **自行录制指南**：参考本文末尾的「音频文字稿」和「视频拍摄脚本」，用手机即可录制。音频建议使用剪映/Audacity，视频建议使用 OBS 录屏 + 剪映剪辑。

---

## 📂 仓库文件说明

### ⚠️ 重要：GitHub 仓库不包含以下内容

此仓库仅存放 **程序源代码与框架结构**。以下内容为私有数据，**不会提交到 GitHub**：

| 私有数据 | 说明 | 存放位置（服务器） |
|----------|------|-------------------|
| 📄 原始题库 .txt 文件 | 8 个学科的原始题目文本 | `~/medcardgame/*题库.txt` |
| 👥 用户数据库 | 账号、错题记录、学习进度 | `~/medcardgame/data/` |
| 🔑 环境配置密钥 | .env 文件、API 密钥 | `~/medcardgame/.env` |
| ⚙️ 服务器配置文件 | Nginx/PM2/部署脚本 | `~/medcardgame/config/` |

### 🛤️ 获取完整项目的两种方案

#### 方案 A：本地开发（推荐给二次开发者）

```bash
# 1. 克隆 GitHub 仓库到本地
git clone https://github.com/YOUR_USERNAME/medcardgame.git
cd medcardgame

# 2. 从服务器下载私有题库压缩包
scp ubuntu@YOUR_SERVER_IP:~/medcardgame-backup-YYYYMMDD.tar.gz .

# 3. 解压并合并到项目目录
tar xzf medcardgame-backup-YYYYMMDD.tar.gz -C medcardgame/

# 4. 安装依赖
npm install

# 5. 用 VS Code 打开，开始开发
code .
```

#### 方案 B：全新服务器部署

```bash
# 1. SSH 登录新服务器
ssh ubuntu@YOUR_NEW_SERVER_IP

# 2. 克隆仓库
git clone https://github.com/YOUR_USERNAME/medcardgame.git
cd medcardgame

# 3. 上传私有题库压缩包（在本地电脑执行）
scp medcardgame-data-YYYYMMDD.tar.gz ubuntu@YOUR_NEW_SERVER_IP:~/medcardgame/

# 4. 在服务器解压还原
tar xzf medcardgame-data-YYYYMMDD.tar.gz

# 5. 一键部署
sudo bash deploy.sh
```

---

## 💻 本地电脑 VS Code 开发完整教程

### 环境要求

| 工具 | 版本要求 | 用途 |
|------|---------|------|
| [VS Code](https://code.visualstudio.com/) | 最新版 | 代码编辑器 |
| [GitHub Copilot](https://github.com/features/copilot) | 付费订阅 | AI 辅助编程 |
| [Node.js](https://nodejs.org/) | 18.x / 20.x | 构建工具链 |
| [Git](https://git-scm.com/) | 最新版 | 版本控制 |
| SSH 客户端 | 系统自带 | 连接服务器传输文件 |

### 第一步：从服务器导出私有题库压缩包

SSH 登录你的腾讯云服务器，执行打包命令：

```bash
# 登录服务器
ssh ubuntu@YOUR_SERVER_IP

# 创建备份目录并打包私有数据
cd ~/medcardgame
mkdir -p ~/backups

# 打包私有题库 + 数据库 + 配置（排除 node_modules、.git）
tar czf ~/backups/medcardgame-data-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='*.log' \
  *题库.txt \
  data/ \
  config/ \
  .env \
  server.js \
  ecosystem.config.js

# 查看打包文件大小
ls -lh ~/backups/medcardgame-data-*.tar.gz
```

### 第二步：下载到本地电脑

在本地电脑终端（Mac/Linux）或 PowerShell（Windows）执行：

```bash
# 下载压缩包到本地
scp ubuntu@YOUR_SERVER_IP:~/backups/medcardgame-data-YYYYMMDD.tar.gz ~/Downloads/
```

### 第三步：克隆仓库并解压合并

```bash
# 克隆 GitHub 仓库
cd ~/Projects
git clone https://github.com/YOUR_USERNAME/medcardgame.git
cd medcardgame

# 解压私有数据到项目目录
tar xzf ~/Downloads/medcardgame-data-YYYYMMDD.tar.gz

# 安装依赖
npm install

# 用 VS Code 打开项目
code .
```

### 第四步：VS Code + Copilot 开发工作流

```
┌─────────────────────────────────────────────────────┐
│  1. 修改代码    VS Code 中编辑 src/ 目录下的文件      │
│  2. 语法检查    node --check src/modules/xxx.js      │
│  3. 构建验证    npm run build                         │
│  4. 本地预览    npx serve .  →  浏览器打开测试         │
│  5. 提交推送    git add . && git commit && git push   │
│  6. 服务器更新  服务器 git pull && pm2 restart all    │
└─────────────────────────────────────────────────────┘
```

```bash
# 常用命令速查
npm run build          # 生产构建（输出到 dist/）
npm run watch          # 开发模式（文件变更自动构建）
npm test               # 运行测试
npm run lint           # 代码风格检查
npx serve .            # 本地静态服务器预览（端口 3000）

# 推送到 GitHub
git add .
git commit -m "feat: 描述你的修改内容"
git push origin main
```

> 💡 **Copilot 技巧**：在 VS Code 中选中代码块，按 `Ctrl+I`（Mac: `Cmd+I`）打开 Copilot Chat，用中文描述需求即可生成代码。例如："把这个函数改为使用 async/await"或"给这个模块写单元测试"。

---

## 🚀 云服务器部署 & 迁移完整教程

### 目标环境

| 组件 | 版本/配置 |
|------|----------|
| 操作系统 | Ubuntu 22.04 LTS |
| Node.js | 20.x |
| 进程管理 | PM2 (Cluster 模式, 2 实例) |
| 反向代理 | Nginx (HTTP/2 + Gzip) |
| 缓存 | Redis (128MB, LRU 淘汰) |
| 防火墙 | UFW (80/443/22 端口) |

### 新服务器一键部署

```bash
# 1. SSH 登录新服务器
ssh ubuntu@YOUR_NEW_SERVER_IP

# 2. 克隆仓库
git clone https://github.com/YOUR_USERNAME/medcardgame.git ~/medcardgame
cd ~/medcardgame

# 3. 上传私有题库压缩包（从本地电脑执行）
# 在本地电脑终端运行：
scp ~/Downloads/medcardgame-data-YYYYMMDD.tar.gz ubuntu@YOUR_NEW_SERVER_IP:~/medcardgame/

# 4. 回到服务器，解压私有数据
cd ~/medcardgame
tar xzf medcardgame-data-YYYYMMDD.tar.gz

# 5. 运行一键部署脚本
sudo bash deploy.sh

# 6. 验证服务状态
pm2 status
curl http://localhost:8080
```

部署脚本 `deploy.sh` 会自动完成：
- ✅ 系统更新 + Node.js 20.x 安装
- ✅ Redis 安装与内存优化配置
- ✅ Nginx 安装与站点配置
- ✅ npm 依赖安装
- ✅ PM2 集群模式启动（2 实例）
- ✅ 开机自启动配置

### 旧服务器数据备份（迁移前必做）

SSH 登录旧服务器，执行完整备份：

```bash
# 登录旧服务器
ssh ubuntu@YOUR_OLD_SERVER_IP

# 执行备份脚本（如果已配置 crontab 则自动执行）
bash ~/medcardgame/config/backup-audit.sh

# 或手动创建完整打包
cd ~
tar czf medcardgame-full-backup-$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  medcardgame/

# 下载到本地电脑保存
# 在本地电脑执行：
scp ubuntu@YOUR_OLD_SERVER_IP:~/medcardgame-full-backup-*.tar.gz ~/Downloads/
```

### 服务器日常运维命令

```bash
pm2 status              # 查看进程状态
pm2 logs medicard       # 查看应用日志
pm2 restart medicard    # 重启应用
pm2 monit               # 实时监控面板
nginx -t                # 检查 Nginx 配置
redis-cli INFO memory   # 查看 Redis 内存使用
df -h                   # 查看磁盘使用量
```

---

## 📁 项目目录结构

```
medcardgame/
│
├── index.html                  # 开发入口（模块化加载 56 个 JS + 22 个 CSS）
├── server.js                   # 生产服务器（HTTP + PeerJS + WebSocket 三合一）
├── package.json                # Node.js 依赖与脚本
├── ecosystem.config.js         # PM2 集群配置
│
├── src/                        # ═══ 源码目录（Git 跟踪） ═══
│   ├── modules/
│   │   ├── card-system/        # 卡牌系统（120+ 卡牌数据/效果/动画/视觉）
│   │   ├── game-core/          # 游戏核心（血量/资源/回合/胜利条件）
│   │   ├── identity-system/    # 身份系统（主公/忠臣/反贼/内奸 + 专属技能）
│   │   ├── ui-system/          # UI 系统（13 个屏幕 + 7 个组件）
│   │   │   ├── screen-battle.js    # 对战主界面
│   │   │   ├── screen-study.js     # 刷题工坊（章节选择/答题/进度追踪）
│   │   │   ├── screen-fastlearn.js # 快学模式（认知科学间隔重复）
│   │   │   ├── screen-notebook.js  # 错题本（浏览/自测/导出）
│   │   │   ├── screen-subject.js   # 科目选择（章节级过滤）
│   │   │   ├── screen-auth.js      # 用户认证
│   │   │   ├── screen-title.js     # 首页大厅
│   │   │   ├── screen-lobby.js     # 联机大厅
│   │   │   ├── screen-result.js    # 结算界面
│   │   │   └── screen-sr.js        # 解压小游戏
│   │   ├── network/            # 网络层（P2P/房间/同步协议/中继传输）
│   │   ├── question-bank/      # 题库系统（懒加载/章节过滤/反向索引）
│   │   │   └── subjects/       # 8 个学科JS文件（Git跟踪，共 ~8300 行题目）
│   │   ├── fastlearn/          # 快学引擎（7 个模块：记忆/调度/考前/前置依赖等）
│   │   ├── community/          # 社区功能
│   │   ├── storage/            # 本地存储（含章节进度持久化）
│   │   ├── security/           # 安全模块
│   │   ├── debug/              # 调试工具
│   │   └── timer/              # 计时器
│   ├── css/                    # 样式表（23 个文件，按模块/组件/动画拆分）
│   ├── lib/                    # 外部库（LZ-String, PeerJS）
│   └── assets/                 # 静态资源
│
├── tools/                      # 构建/验证工具（Git跟踪）
│   ├── build-prod.js           # 生产构建：56 JS → 1 bundle.js
│   └── generate-*.js           # 题库生成脚本（从 .txt 生成 .js）
│
├── config/                     # ⚠️ 服务器配置（Git忽略，需手动备份）
│   ├── nginx-medicard.conf     # Nginx 站点配置
│   ├── backup-audit.sh         # 自动备份 + 安全审计脚本
│   └── setup-firewall.sh       # 防火墙规则
│
├── data/                       # ⚠️ 运行时数据（Git忽略，需手动备份）
│   └── *.json                  # 用户账号/错题/排行榜持久化文件
│
├── dist/                       # 构建输出（Git忽略，npm run build 生成）
│
├── *.txt                       # ⚠️ 原始题库文本（Git忽略，隐私数据）
│   ├── 生化题库.txt            # 生物化学原始题库
│   ├── 生理学题库.txt          # 生理学原始题库
│   ├── 病理题题库.txt          # 病理学原始题库
│   ├── 微生物学题库.txt        # 微生物学原始题库
│   ├── 免疫学题库.txt          # 免疫学原始题库
│   ├── 系解题库.txt            # 系统解剖学原始题库
│   ├── 系解题库补充.txt        # 系解补充题库
│   └── 组胚题库.txt            # 组织胚胎学原始题库
│
├── .env                        # ⚠️ 环境变量（Git忽略，含密钥）
├── .gitignore                  # Git 忽略规则
├── _headers / _redirects       # Cloudflare Pages 配置
└── deploy.sh                   # Ubuntu 22.04 一键部署脚本
```

> ⚠️ 标记为「Git忽略，需手动备份」的目录/文件在 `git clone` 后不存在，需从服务器获取。

---

## 📦 私有题库数据迁移方案

### 为什么 GitHub 仓库没有题库文件？

- 原始题库 .txt 文件来自医学教科书习题集，涉及版权保护
- 用户数据库（错题记录、学习进度）属于用户隐私数据
- 服务器配置文件（.env、Nginx）包含密钥和 IP 信息

### 完整数据打包方法（在服务器执行）

```bash
#!/bin/bash
# 完整项目打包脚本 — 包含所有私有数据
# 用法: bash pack-full.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT="medcardgame-private-$TIMESTAMP.tar.gz"

cd ~/medcardgame

tar czf ~/"$OUTPUT" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='*.log' \
  ./

echo "✅ 打包完成: ~/$OUTPUT"
echo "   大小: $(du -sh ~/"$OUTPUT" | cut -f1)"
echo ""
echo "📥 下载到本地:"
echo "   scp ubuntu@$(hostname -I | awk '{print $1}'):~/$OUTPUT ~/Downloads/"
```

### 还原到新服务器

```bash
# 1. 上传压缩包到新服务器
scp medcardgame-private-*.tar.gz ubuntu@YOUR_NEW_IP:~

# 2. 在新服务器解压
ssh ubuntu@YOUR_NEW_IP
mkdir ~/medcardgame
tar xzf ~/medcardgame-private-*.tar.gz -C ~/medcardgame/
cd ~/medcardgame

# 3. 安装依赖并部署
npm install
sudo bash deploy.sh
```

---

## ❓ FAQ 常见问题

<details>
<summary><strong>Q1: git clone 后运行报错 "题库加载失败"，怎么办？</strong></summary>

GitHub 仓库仅包含源码框架，不含题库数据。你需要从服务器下载私有题库压缩包并解压到项目目录。详见上方「私有题库数据迁移方案」章节。

```bash
# 快速解决：
scp ubuntu@YOUR_SERVER_IP:~/backups/medcardgame-data-*.tar.gz .
tar xzf medcardgame-data-*.tar.gz
npm install && npm run build
```
</details>

<details>
<summary><strong>Q2: 如何把服务器上的完整项目迁移到本地电脑开发？</strong></summary>

三步完成：
1. 服务器打包私有数据 → `tar czf backup.tar.gz *题库.txt data/ config/ .env`
2. 本地下载 → `scp ubuntu@IP:~/medcardgame/backup.tar.gz .`
3. 合并到 Git 克隆的仓库 → `tar xzf backup.tar.gz` + `npm install`

详见上方「本地电脑 VS Code 开发完整教程」章节。
</details>

<details>
<summary><strong>Q3: 旧服务器快过期，如何备份全部数据？</strong></summary>

执行服务器上的备份脚本（已配置 crontab 每日凌晨 3 点自动备份到 `~/backups/medicard/`）：

```bash
# 手动立即备份
bash ~/medcardgame/config/backup-audit.sh

# 查看备份文件
ls -lh ~/backups/medicard/

# 下载所有备份到本地
scp -r ubuntu@YOUR_OLD_IP:~/backups/medicard/ ~/medcard-backups/
```

备份包包含：题库文件 + 用户数据库 + 配置 + 安全审计日志。
</details>

<details>
<summary><strong>Q4: 本地修改代码后怎么同步到线上服务器？</strong></summary>

```bash
# 本地提交推送
git add . && git commit -m "描述修改内容" && git push origin main

# SSH 登录服务器拉取更新
ssh ubuntu@YOUR_SERVER_IP
cd ~/medcardgame
git pull origin main
npm run build              # 重新构建（如果修改了 JS/CSS）
pm2 restart medicard       # 重启应用
```

如果是 Cloudflare Pages 部署，推送 GitHub 后自动重新部署，无需手动操作。
</details>

<details>
<summary><strong>Q5: 多人联机功能需要什么额外设置吗？</strong></summary>

PeerJS 信令服务器已内置在 `server.js` 中（端口 9000），同时提供 WebSocket 中继作为备选方案。部署脚本会自动配置防火墙规则。如果部署到 Cloudflare Pages，联机功能通过 WebSocket 中继到你的服务器实现。
</details>

---

## 📋 项目更新日志

详见 [V6.5_CHANGELOG.md](./V6.5_CHANGELOG.md)

<details>
<summary><strong>最近更新摘要</strong></summary>

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| v6.5.0 | 2026-05 | FastLearn 认知科学重构：8 种错误基因 + 考前冲刺模式 + 干扰项分析 + 持久化加固 |
| v6.0.0 | 2026-05 | 快学模式上线：智能间隔重复 + 双轨记忆 + 交错调度 |
| v5.0.0 | 2026-04 | 章节级选题 + 刷题工坊 6 主题 + Cloudflare Pages 兼容 |
| v4.0.0 | 2026-03 | 网页端刷题工坊独立模块 + Speed Engine 加速引擎 |
| v3.0.0 | 2026-02 | 多人联机重构：WebRTC + WebSocket 双通道 + 中继传输 |
| v2.0.0 | 2026-01 | 120+ 卡牌系统 + 5 人身份局 + AI 对手 |
| v1.0.0 | 2025-12 | 初始版本：卡牌对战核心机制 + 题库系统 |
</details>

---

## 📄 开源协议

本项目基于 **MIT License** 开源。你可以自由使用、修改和分发代码，但需保留原始版权声明。

- ✅ 个人学习 / 二次开发 / 商业使用
- ✅ 修改代码后闭源发布
- ⚠️ 题库数据（.txt / subjects/*.js）来自医学教科书习题集，仅供学习用途，请勿商用

---

## 👤 作者 & 贡献

**MedCard Duel** 由医学爱好者与全栈开发者联合打造。

- 🐛 [报告 Bug](../../issues/new?template=bug-report.yml)
- 💡 [建议新功能](../../issues/new?template=feature-request.yml)
- 🔀 [提交 Pull Request](../../compare)

> ⭐ 如果这个项目对你有帮助，请点亮 Star 支持一下！你的鼓励是我们持续更新的动力 💪

---

## 📎 附录

### 附：音频文字稿

> 📄 完整文案另存为独立文件：[docs/audio-script.txt](./docs/audio-script.txt)  
> 🎙️ 以下为浓缩版，可直接朗读录制（约 3 分钟）

---

大家好，欢迎了解 MedCard Duel 医学刷题工坊。

这是一款把医学题库和卡牌对战结合起来的学习工具。想象一下，三国杀那种回合制出牌玩法，但每张卡牌的效果需要通过答题来判定——答对了攻击才生效，答错了白白浪费一张牌。这就逼着你去认真复习知识点，因为你不想在朋友面前丢脸。

项目有几个独立模块：想一个人安静刷题，打开"医途刷题工坊"，六个主题皮肤随便换，章节随便选；想系统性地对抗遗忘曲线，打开"快学模式"，它会用认知科学算法帮你安排复习时间；做错的题会自动收进错题本，每道题都有详细的解析和干扰项分析。

如果你是个开发者，想自己动手改代码：克隆 GitHub 仓库到本地，从服务器下载私有题库压缩包解压，npm install 装一下依赖，VS Code 打开就能改了。Copilot 可以帮你写代码，改完 git push 推送，服务器上 git pull 拉取更新，pm2 restart 重启一下就好。

如果你是第一次部署到新服务器：SSH 登录后 git clone 仓库，上传私有题库压缩包，然后运行一句 sudo bash deploy.sh，脚本会自动装好 Node.js、Redis、Nginx、PM2，配置好防火墙和开机自启。

所有的题库数据、用户记录、配置文件都在服务器上，GitHub 仓库只有代码框架。这样既保护了隐私，又方便协作开发。

有什么问题欢迎提 Issue，也欢迎提交 PR 一起完善这个项目。感谢你的关注！

---

### 附：实操短视频拍摄脚本

> 📄 完整脚本另存为独立文件：[docs/video-script.md](./docs/video-script.md)  
> 🎬 以下为浓缩版分镜头大纲（约 10 分钟）

| 镜头 | 时间 | 画面内容 | 解说要点 |
|------|------|---------|---------|
| 1 | 0:00-0:30 | 标题卡 + 项目 Logo 动画 | "今天带你从零搭建 MedCard Duel 医学刷题工坊" |
| 2 | 0:30-1:30 | 浏览器打开演示站，快速导览各功能 | 卡牌对战 → 刷题工坊 → 快学模式 → 错题本 |
| 3 | 1:30-3:00 | VS Code 界面：git clone + 文件结构讲解 | "GitHub 仓库只有代码框架，题库需要从服务器下载" |
| 4 | 3:00-5:30 | 终端操作：服务器打包 → scp 下载 → 解压合并 | "打包私有数据，下载到本地，合并到项目目录" |
| 5 | 5:30-7:00 | npm install + npm run build + npx serve 启动 | "安装依赖，构建项目，本地预览" |
| 6 | 7:00-8:30 | SSH 到新服务器：git clone → 上传压缩包 → deploy.sh | "新服务器三步部署：拉代码、传数据、运行脚本" |
| 7 | 8:30-9:30 | 浏览器访问服务器 IP，验证部署成功 | "部署完成！浏览器输入 IP 即可访问" |
| 8 | 9:30-10:00 | 结尾总结 + 仓库链接 + 求 Star | "GitHub 链接在简介，有问题提 Issue，感谢支持" |

---

<p align="center">
  <sub>Made with ❤️ by medical education enthusiasts | Powered by Cognitive Science & Open Source</sub>
</p>
