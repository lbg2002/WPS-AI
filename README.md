<h1 align="center">灵犀AI · WPS Office 多宿主 AI 助手</h1>

<p align="center">
  一个 TaskPane 兼容 <b>WPS 文字 / 表格 / 演示 / PDF</b> 四端的 AI 助手，挂多家 AI（Codex / OpenAI / Anthropic / Gemini / Azure / OpenAI 兼容），AI 通过工具调用<b>直接读写文档</b>。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/WPS-文字·表格·演示·PDF-red" alt="WPS" />
  <img src="https://img.shields.io/badge/vibe--coded-100%25-ff69b4" alt="Vibe Coded" />
</p>

<p align="center">
  <a href="https://wps-ai.llteac.cn/download"><b>⬇ 下载</b></a> ·
  <a href="#-5-分钟上手">5 分钟上手</a> ·
  <a href="#-部署与无网安装">部署与无网安装</a> ·
  <a href="#-功能一览">功能一览</a> ·
  <a href="#-项目结构">项目结构</a> ·
  <a href="#-二次开发">二次开发</a> ·
  <a href="#-已知限制">已知限制</a> ·
  <a href="README.en.md">English</a>
</p>

> 🤖 100% 由 Vibe coding 完成：架构、provider 适配、PPT 主题/图表、Word 渲染、跨平台安装器、文档全程由 [Claude](https://claude.com/claude-code) 和人类对话迭代而来。仓库里没有一行手敲代码 —— 也欢迎你 fork 自己 vibe。

<p align="center">
  <img src="img/1.png" width="32%" />
  <img src="img/2.png" width="32%" />
  <img src="img/3.png" width="32%" />
</p>

---

## 本 Fork 的 main 分支

本仓库 `lbg2002/WPS-AI` 的 `main` 已合入 Linux 右侧面板、紧凑聊天工具栏、正文选区引用、后台卡住自动恢复及面板宽度保持修复。

- **正文引用**：选中文本后右键「引用到灵犀AI」，或功能区「引用选区」。多个引用以灰色折叠卡片显示，可展开、删除，发送问题时才附带完整原文；切换文档清空待发送引用。未保存的文档需先保存。
- **Linux 输入**：默认使用右侧 TaskPane；润色比对、设置等使用面板内弹层。复用面板时保留手动调整的宽度，完全退出 WPS 后新建面板仍用默认宽度。
- **后台恢复**：静态服务监测自己启动的代理子进程，连续健康检查失败后自动重启。具体卡死触发原因尚未完全定位，恢复会中断当时正在执行的请求。
- **验证范围**：相关 Node 模拟测试通过；用户已反馈其 Linux 环境侧栏输入、引用和宽度问题得到改善。各 WPS 版本的右键菜单、宿主能力及 Windows/macOS 安装仍需对应环境验证，右键不可用时使用功能区入口。

下方官网安装包属于上游发布，不保证含本 Fork 的修改。要使用这里的 `main`，请按本 README 的部署指南从该分支构建安装包，或同步源码到已有 Linux 安装。

## ✨ 亮点

| 🖥 多宿主统一 | 🔌 多协议接入 | ✍️ 直接读写文档 |
|---|---|---|
| 文字 / 表格 / 演示 / PDF 四端共用一套 TaskPane，宿主自动分发 | Codex / OpenAI / Anthropic / Gemini / Azure / OpenAI Responses + 本地 Ollama，可同时挂多家随时切 | AI 通过工具调用直接操作文档；**预览确认** / **AI 直接写入** 两档安全 |

## 🧭 架构

```text
WPS 宿主（文字/表格/演示/PDF）
        │  JSAPI
   TaskPane（WebView）── app.js / hosts / tools / providers 门面
        │  fetch（本地回环）
   proxy-server.js（Node）── CORS 代理 · 文件/备份 · MCP Server/Client 端点
        │
   AI Providers（Codex / OpenAI / Anthropic / Gemini / Azure / Responses / 兼容）
   外部 MCP 服务（stdio / SSE）← MCP Client
```

---

## ⚡ 5 分钟上手

### 1. 下载安装包

前往 **[下载页 → wps-ai.llteac.cn/download](https://wps-ai.llteac.cn/download)** 获取对应平台安装包。各平台包都内置 Node 运行时，**无需单独装 Node**。

| 平台 | 安装包 | 大小 | 下载 |
|---|---|---|---|
| **Windows** | `.exe` 安装器 | ~30 MB | [⬇ 下载](https://wps-ai.llteac.cn/download) |
| **macOS** | `.pkg`（Intel + Apple Silicon） | ~35 MB | [⬇ 下载](https://wps-ai.llteac.cn/download) |
| **Linux** | x64 / arm64 | ~35 MB | [⬇ 下载](https://wps-ai.llteac.cn/download) |

### 2. 安装

- **Windows**：运行可信来源的 setup.exe → 完全退出 WPS → 重开 WPS，ribbon 出现「灵犀AI」标签即成功
- **macOS**：**右键 .pkg → 打开**（Gatekeeper 拦未签名包，双击会报错）→ 输系统密码 → 完全退出 WPS → 重开 WPS

- **Linux**：推荐使用带本机架构 Node 的 `.tar.gz` 完整包，解压后以当前桌面用户运行 `bash install.sh`；具体命令见下方部署指南。

详细步骤（卸载 / 升级 / 故障排查 / 安装器构建）见 [INSTALL.md](INSTALL.md)。

### 3. 配置 AI 模型

1. 功能区点「右侧面板」→ ⚙ 设置（Linux 在面板内打开）
2. 「聊天模型」面板 → **+ 新增供应商** → 15 条预设里选一家（baseURL 已预填）
3. 填 API Key → ⚡ 测试 → 关闭设置 → 聊天输入框下方选择模型开聊

**可同时挂多家**：DeepSeek + Anthropic + Codex + Gemini 一起开，下拉里随时切。

| 预设 | 说明 |
|---|---|
| **Codex（ChatGPT OAuth）** | 走 OAuth，无需 Key |
| **Anthropic** / **OpenAI** | Claude Messages / Chat Completions |
| **Gemini** | Google 原生 `generateContent`（`x-goog-api-key`） |
| **Azure OpenAI** | 资源 endpoint + 部署名 + api-version |
| **OpenAI Responses** | 通用 `/responses`（API Key，非 OAuth） |
| **DeepSeek / Kimi / Qwen / GLM / 豆包 / 硅基 / OpenRouter** | 各家 OpenAI 兼容协议 |
| **本地 Ollama** | `http://localhost:11434/v1`（免 Key） |
| **自定义** | URL + Key 自填 |

#### 系统要求

| 项 | Windows | macOS | Linux |
|---|---|---|---|
| **操作系统** | Windows 10 / 11 (x64) | macOS 10.15 Catalina+ (Intel + Apple Silicon) | 主流发行版 (x64 / arm64) |
| **WPS** | WPS Office 12.x+ | WPS Office 5.x+ | WPS Office for Linux 11.1+ |
| **运行时** | 内置便携 Node 22.x | 内置 darwin-x64 + arm64 Node | 内置 linux-x64 + arm64 Node |

不支持 WebOffice、移动端 WPS、低版本桌面客户端 —— JSAPI 加载项要求桌面客户端 + 上述最低版本。

---

## 📦 部署与无网安装

### 运行方式与前提

插件部署在自己的电脑上，**不需要域名、公网服务器或端口映射**。WPS 从本机 `127.0.0.1:3889` 加载界面，通过本机代理调用模型（默认端口 `3890`，占用时可能回退到其他端口）。请保留本地回环访问。

| 场景 | 是否需要互联网 |
|---|---|
| 安装带运行时的完整离线包、打开侧栏、添加/删除引用 | 不需要；先安装可用的 WPS 桌面客户端 |
| 使用云端模型、OAuth 登录、在线搜索、远程 MCP、在线生图 | 需要能访问对应服务；所发送的问题和引用会交给配置的服务 |
| 使用本机已准备好的 Ollama 模型 | 模型推理可离线；下载模型和安装器应提前完成 |
| 使用单位内网模型 | 不需要公网，但须能连接内网模型服务 |
| 下载更新、模型能力目录、远程图片/模板资源 | 对应功能需要联网，无法据此保证所有功能完全离线 |

Linux 完整包可内置 x64/arm64 Node，目标电脑无需 npm 或 Git。后台代理需要 **Node 22.5+ 且支持 `node:sqlite`**；GitHub 源码 ZIP 不等于完整离线安装包，通常不含 Linux Node。国产其他架构或旧 glibc 系统需另行准备兼容且支持上述能力的 Node，不能只按旧安装器提示安装 Node 18。

### 已有 Linux 安装：更新到 main

保存文档并完全退出所有 WPS 窗口，在你的本地仓库目录执行（有本地改动时先提交或备份）：

```bash
git fetch origin
git switch main
git pull --ff-only
node --test plugin/test/pane-mode.test.js plugin/test/quote-selection.test.js plugin/test/linux-dialog-routing.test.js plugin/test/ribbon-callbacks.test.js plugin/test/linux-source-sync.test.js
bash scripts/linux-sync-installed.sh
systemctl --user restart lingxi-ai.service
```

此方式需要本地可用的 `node` 生成各宿主功能区。若 PATH 没有 Node，可以先把已安装的内置 Node 所在 `bin` 目录加入 PATH，再执行测试和同步；查看实际服务配置可用 `systemctl --user cat lingxi-ai.service`。没有 systemd 用户服务的安装方式，请退出 WPS，重新登录桌面会话让自启动入口加载更新。

同步脚本备份到 `~/.lingxi-ai/source-backups/`，不覆盖 API Key、会话和 WPS 共享 `publish.xml`。回滚用 `bash scripts/linux-restore-last-sync.sh`，随后重启服务并重开 WPS。更新本 Fork 不要求重装原来的 DEB。

### 全新 Linux 安装：联网电脑准备完整离线包

在一台 **有网的 Linux 构建电脑** 上准备 Git、Node 22.5+、Bash、GNU tar、xz 和基本 coreutils。目标电脑提前安装 WPS。先在目标电脑记录 `uname -m`：`x86_64` 选择 `x64`，`aarch64` 选择 `arm64`。跨架构打包可以，运行效果需在目标系统确认。

```bash
git clone --branch main https://github.com/lbg2002/WPS-AI.git
cd WPS-AI
# 按目标电脑架构修改；与构建电脑的架构可以不同
LINGXI_ARCH=x64
bash installer-linux/build.sh --arch "$LINGXI_ARCH" --format tar
# 构建会下载匹配架构的内置 Node，并带入完整插件与安装脚本
LINGXI_VERSION=$(node -p "require('./plugin/package.json').version")
cd dist
sha256sum "lingxi-ai-${LINGXI_VERSION}-linux-${LINGXI_ARCH}.tar.gz" > SHA256SUMS
```

此永久安装包的构建与基本运行不需要 `npm install`；不要在无网电脑执行开发模式的 `npm install` / `npm run dev`。构建脚本会清理其 `installer-linux/build/` 临时目录，请勿在该目录放个人文件。

将生成的 **`.tar.gz` 和 `SHA256SUMS` 一起**复制到 U 盘或内网共享，再传到无网电脑。保留该包对应的源码提交号，避免把同版本号的上游旧包与本 Fork 包混用。Windows/macOS 请提前准备对应平台、含运行时的完整安装包，不能使用 Linux 包替代。本 Fork 可在对应平台运行 `node upload-oss/lib/build-installer.js win` / `node upload-oss/lib/build-installer.js mac` 构建；Windows 需先准备 Inno Setup，macOS 需其原生打包工具。构建入口会下载缺失的 Node 运行时；只运行构建命令，无需配置 OSS 或上传。macOS 打包入口和说明见 [installer-mac](installer-mac/README.md)。

### 无网 Linux 电脑：安装完整包

以当前桌面登录用户操作，先保存文档并关闭 WPS。在存放包和校验文件的目录执行；下面以 `1.4.7` / x64 为例，文件名和解压目录按你实际生成的版本替换：

```bash
sha256sum -c SHA256SUMS
tar -xzf lingxi-ai-1.4.7-linux-x64.tar.gz
cd lingxi-ai-1.4.7
bash install.sh
```

**这里不需要联网，也不需要 sudo、Git、npm 或在线安装依赖。**目标系统需已有 Bash、tar、基本 Linux 工具及可运行的 WPS；内置 Node 还需与目标系统的架构、glibc 兼容。安装文件默认放入 `~/.local/share/lingxi-ai`，运行文件和日志位于 `~/.lingxi-ai`。先验证校验和及内置 Node（`plugin/runtime/node-linux-x64/bin/node --version`，arm64 换相应目录），若报 GLIBC 错误，应提前准备适配系统的 Node 或更新系统环境。

安装脚本会离线生成四个宿主变体、合并 WPS 插件注册，并设置 systemd 用户服务；没有可用 systemd 时使用桌面自启动。完全退出后重开 WPS，点击「灵犀AI → 右侧面板」。

DEB 是可选方式：有网电脑用 `--format tar,deb` 构建，目标电脑执行 `sudo dpkg -i ./lingxi-ai_1.4.7_amd64.deb`。系统依赖必须预先齐全；无网时不要依赖 `apt install -f` 在线补依赖。对发行版依赖不确定时优先使用上面的完整 tar 包。

### 无网环境使用模型

- **本地 Ollama**：在有网电脑准备目标平台的 Ollama 安装文件，并提前拉取所需模型；将完整模型存储目录连同 manifests/blobs 转移到目标电脑，保持 Ollama 版本和模型格式兼容。官方模型路径说明见 [Ollama FAQ](https://docs.ollama.com/faq)。在无网电脑启动 Ollama 后，用 `ollama list` 确认模型存在；灵犀AI 设置选择 Ollama，Base URL 填 `http://127.0.0.1:11434/v1`，选择已安装且支持工具调用的模型。聊天质量、工具能力和内存需求取决于模型，不保证任意本地模型能执行全部文档工具。
- **内网模型**：选 OpenAI 兼容供应商，填写内网 Base URL、模型名称和所需密钥。仅能访问内网时不要选择公网 OAuth 或云端 API。
- **没有可用模型服务**：安装和侧栏仍可用，但不会凭空获得 AI 推理能力；仅复制插件安装包不会包含大模型权重。在线更新、联网搜索、远程图片等功能在无网环境不可用，部分资源刷新会超时。

### 验证与排错

先保存文档，再试中文输入、选区引用、润色比对、接受/取消操作和拖动面板宽度。没有实机验证的 WPS/系统组合，请先用副本文档确认。

```bash
# 安装采用 systemd 时
systemctl --user status lingxi-ai.service --no-pager
# 如果已装 curl，可检查本地界面和代理；3890 以实际日志端口为准
curl --max-time 3 http://127.0.0.1:3889/wps/manifest.json
curl --max-time 3 http://127.0.0.1:3890/healthz
# 需要恢复卡住的后台时
systemctl --user restart lingxi-ai.service
tail -n 50 ~/.lingxi-ai/server.log
```

守护脚本可能在 WPS 全部关闭后停止后台，验证时先打开 WPS；网络完全断开不会让本机回环地址消失。“插件启动中”持续不消失应先查后台健康和日志，不要直接反复重装。日志可能含文件路径等信息，反馈前请清除个人信息。

进一步说明：[Linux 侧栏与输入](docs/linux-docked-taskpane.md)、[选区引用](docs/quote-selection.md)、[安装指南](INSTALL.md)。

---

## 🧩 功能一览

### AI 接入

- 同时挂多家 chat provider，聊天输入框下方的模型列表按 provider 分组随时切
- **6 类协议原生适配**：Codex / OpenAI Chat Completions / Anthropic Messages / **Gemini** / **Azure OpenAI** / **通用 OpenAI Responses**，外加各家 OpenAI 兼容聚合器 —— 共 15 条预设 + 一条自定义
- 思考（reasoning）**按到达顺序实时回显**，按 provider 映射 `thinking.budget_tokens` / `reasoning_effort` / `reasoning.effort` / `thinkingConfig`
- 模型能力图标：🖼 图像 / 📄 PDF / 💡 思考（models.dev 目录 + 名字正则兜底）
- 流式输出 + tool-use 循环：一次对话内连续调多个工具操作文档
- **预览确认模式** vs **AI 直接写入模式**：两档安全
- PDF 当多模态附件喂大模型（Claude document block / OpenAI Files API / Codex input_file）

### MCP（双向）

- **MCP Server**：把 WPS 工具暴露给外部 agent（Claude Code CLI / Claude Desktop / Cursor），配置 JSON 一键复制
- **MCP Client**：连接外部 MCP 服务（本地 stdio 子进程 / 远程 SSE），把它们的工具纳入 AI 对话，命名空间 `mcp__<服务>__<工具>`；支持启停开关 / 查看工具清单与参数 / 测试连接 / 从 JSON 一键导入

### 对话 / 时间轴

- **Claude-code 风格时间轴**：推理 / 工具调用 / 文本回复交织，rail 节点圆点 + 每步耗时；实时展示 == 历史回放完全一致
- 多对话管理 + 历史独立弹窗（今天 / 7 天内 / 7 天前 分组）
- 生图独立 tab；工具调用气泡默认只显示尾部参数预览，结果到达即收起（设置里可开完整 JSON 日志）
- AI 工作期间文档锁定 banner + 进度合并
- 系统提示词可定制；「技能」（内置 4 套 + 导入 .md/.txt）按场景拼进 system prompt

### 操作安全

- AI 工作期间硬锁文档（Word `Document.Protect` / Excel `UserInterfaceOnly`）
- 临时文档拒绝修改（聊天前 fail-fast）
- per-turn 文档备份 + 一键回退（自动 GC 最近 20 份）
- **改动记录 Tab**：按文件分组，展开看入参 / 前后快照 / 错误
- 配置导入导出（API Key 加密 + 版本兼容）

### 宿主能力

| 宿主 | 能力速览 |
|---|---|
| **文字** | 6 组快捷按钮（写作 / 改写 / 润色 / 翻译 / 总结 / 智能）+ markdown→Word 原生格式（真表格 + 嵌套列表 + 段落缩进清零）+ 扫描红字/高亮/底纹 + 批量清格式 + 读取批注 |
| **表格** | 单元格 / 范围读写、批量格式化、表格美化、列宽自适应、AI 生成公式 / 转表 / 校对、读取批注 |
| **演示** | 50+ 套带设计理念色板 + 8 套形状模板 + 4 套 SVG 视觉模板 + 6 类图表 + 大纲生成 PPT + HTML 模板系统（17 套 layout）+ 可视化编辑器（拖拽 / 8 向 resize / 多选 / PS 风对齐参考线 + 吸附）+ ECharts + 读取批注 |
| **PDF** | 对照翻译（原文/译文表格）+ 全文总结 + 生成 PPT 大纲 + PDF 问答 + 智能推荐操作 |

---

## 🗂 项目结构

```text
plugin/
├── taskpane.html                   # 业务 UI 入口
├── main.js                         # 脚本加载器（声明式 scripts[]）
├── manifest.json / ribbon.xml      # 插件声明 + ribbon
├── css/style.css
├── js/
│   ├── app.js                      # 业务 UI 编排（对话主循环 / 设置 / 时间轴接线）
│   ├── openai.js                   # provider 门面（按 config.type 转发）
│   ├── wps.js / hosts/*            # 宿主分发 + jsapi 桥接（writer / spreadsheet / presentation / pdf）
│   ├── providers/                  # provider 层
│   │   ├── registry.js             #   注册表 + 15 家预设 + 设置存储
│   │   ├── openai.js               #   OpenAI 兼容 + Azure
│   │   ├── anthropic.js            #   Anthropic Messages
│   │   ├── codex.js                #   Codex（ChatGPT OAuth）Responses
│   │   ├── gemini.js               #   Gemini 原生
│   │   ├── openai-responses.js     #   通用 OpenAI Responses
│   │   ├── capabilities.js         #   模型能力检测 + 思考参数
│   │   └── image.js                #   图像 provider
│   ├── tools/*                     # AI 可调用工具（按宿主分组 + registry）
│   ├── chat/timeline.js            # 对话时间轴（实时 == 回放）
│   ├── html-templates/*            # PPT 模板系统（cache / components / renderer / studio）
│   ├── mcp-client.js / mcp-client-ui.js   # MCP Client（plugin 侧）
│   ├── mcp-bridge.js               # MCP Server 桥（plugin 侧）
│   ├── history.js                  # 改动记录 + 快照
│   └── skills.js                   # 技能（内置 + 导入）
└── tools/
    ├── proxy-server.js             # CORS 代理 + 文件 / 备份 / MCP 端点
    ├── mcp-client-manager.js       # MCP Client 连接管理（stdio / SSE，Node 侧）
    ├── mcp-server.js               # stdio MCP server（供外部 agent 用）
    ├── serve-permanent.js          # 永久模式静态服务器
    ├── build-variants.js           # 多宿主变体打包
    └── dev.js / gen-ribbon.js
```

---

## 🛠 二次开发

```bash
cd plugin
npm install
npm run dev:wps   # 或 dev:et / dev:wpp / dev:pdf
```

会同时拉起 CORS 代理（3890）和 wpsjs debug（3889），WPS 自动唤起。

**加新工具** —— 编辑 `js/tools/<host>.js`：

```js
registry.registerTool({
  name: "wps_my_tool",
  hosts: ["wps"],                // 或 ["wps","et","wpp","pdf"]
  description: "...",            // 越清楚 AI 越知道何时调
  parameters: { type: "object", properties: { /* ... */ }, required: [] },
  handler: async (params) => ({ ok: true })
});
```

**加新 provider** —— 新建 `js/providers/<name>.js`，实现 `runWithTools` 等接口后 `WpsAiProviderRegistry.register("<type>", createFn)` 自注册，主链路零改动（详见 `gemini.js` / `openai-responses.js`）。

**加新 ribbon 按钮** —— 编辑 `js/quick-actions.js`，跑 `npm run gen-ribbon`。

**永久模式打包** —— `node tools/build-variants.js --out <dist 目录>`。

---

## ⚠️ 已知限制

- **WPS 26884 及以后的版本存在兼容性问题，待修复**（跟进中）
- WPS 桌面客户端专用，Web / Mobile WPS 均不支持
- Mac WPS WKWebView 永久模式重装后偶尔需清 WebKit 缓存（见 [INSTALL.md](INSTALL.md) Q7）
- `wpsjs debug` 一次只能注册一个宿主，调试切宿主要重启
- Codex OAuth 是非官方复用方案，OpenAI 调整授权策略时可能需更新 `client_id`
- Azure 需自填资源 endpoint + 部署名 + api-version；Gemini 图片输入仅支持 base64 内联
- 图像 provider 协议绑定 toapis，换其他服务需在 `providers/image.js` 适配

---

## 💬 反馈

### 加入粉丝群

扫码关注公众号，回复 `ai` 获取粉丝群链接，和其他用户交流或反馈 Bug：

<img src="img/qrcode_for_gh_e26e731fb54c_258.jpg" alt="公众号二维码" width="160" />

> 微信扫码 → 关注公众号 → 回复 `ai` → 进粉丝群

### Bug 上报信息

发现 Bug 请在群内附上：

- 系统 + WPS 版本
- 哪个宿主、哪个工具触发
- 控制台报错（TaskPane 内右键 → 检查 / 「打开 JS 调试器」）
- `~/.lingxi-ai/server.log` 后 50 行（永久模式）

---

## ⚖️ 许可协议

本项目基于 **[MIT License](LICENSE)** 开源 —— 可自由使用、修改、分发、商用，保留版权与许可声明即可。

> 品牌名称「灵犀AI」、公众号二维码及截图等资产不在 MIT 授权范围内，仅用于标识本项目。
