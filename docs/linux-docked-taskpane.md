# Linux WPS：右侧嵌入式面板（实验）

此分支基于 `fix/linux-ime-composition`，**尚未在用户真实 WPS/X11/Fcitx5 环境中验证**。由于原生 WPS AI 也会出现输入焦点落到正文的问题，不能把这个补丁当成输入法修复。

## 显示模式

- 第一次点击 **打开灵犀AI**：Linux 默认通过 `CreateTaskPane` 嵌入 WPS 右侧。
- **右侧面板**：明确切到嵌入模式，恢复已创建的右侧面板。
- **独立弹窗**：明确切到旧版 `ShowDialog`，隐藏已有右侧面板。
- **打开灵犀AI** 以后按最后一次选的模式打开；使用 WPS `PluginStorage` 和前端 `localStorage` 记录。
- 旧弹窗关闭与新侧边栏创建属于 WPS 不同窗口；需要时手动点浮窗右上角 X，避免两个窗口同时显示。
- 如果 `CreateTaskPane` 不被 WPS 支持，保留原有自动回退到 `ShowDialog` 的代码。

## 安装到现有 Linux WPS（不用重新编译 .deb）

先保存论文，**完全关闭 WPS**，再执行：

```bash
cd ~/git_soft/WPS-AI
git fetch origin
git switch feature/linux-docked-taskpane
node --test plugin/test/pane-mode.test.js
bash scripts/linux-sync-installed.sh
```

如果 `git switch` 提示存在本地未提交修改，先 `git status`，备份或提交自己的改动再切换，不要直接覆盖。节点必须安装 Node.js（此处只用内置模块生成各宿主 ribbon）。

此同步脚本会针对 WPS 文字、表格、演示和 PDF 的现有安装变体单独生成对应的 ribbon 文件，更新 `app.js` / `wps-addon-adapter.js` / `i18n.js` 及功能区声明/回调，生成 `~/.lingxi-ai/source-backups/<时间戳>/` 备份。**不会**重建 DEB、覆盖 `publish.xml`、修改 API Key、对话历史、SQLite、systemd 服务或系统 `/opt/lingxi-ai` 文件。

重开 WPS 后，在顶部「灵犀AI」标签观察「打开灵犀AI」「右侧面板」「独立弹窗」。

## 无需重新安装的回滚

如果右侧模式引起中文输入/粘贴焦点问题或不稳定：

1. 先通过顶部「独立弹窗」恢复旧窗口模式。
2. 若需要撤销全部这次源码同步，保存文档并完全关闭 WPS，执行：
   ```bash
   cd ~/git_soft/WPS-AI
   bash scripts/linux-restore-last-sync.sh
   ```
   重启 WPS 即可。

## 必测场景

1. 右侧面板：点击聊天框输入英文、切换 Fcitx5 输入中文、候选词提交；检查是否误输入正文。
2. 中文输入正常后再测 Ctrl+A/C/V/Z、Enter 发送、Shift+Enter 换行。
3. 点击「独立弹窗」：是否出现独立窗口，右侧面板是否被隐藏。
4. 关闭浮窗后点击「右侧面板」：是否恢复侧栏。
5. Word、Excel、PPT 文档操作仍然正常，切换后 API/对话是否存在。

如果 **WPS 官方 AI 也存在相同焦点问题**，说明可能是 WPS Linux 版本/Qt WebView/Fcitx5 兼容故障；升级 WPS 可能改善，也可能不改善。升级前留存安装包并备份配置，优先选择可信官方渠道。

## 2026-10：紧凑布局调整（同一个分支）

针对用户已测试可中文输入的 Linux X11/Fcitx5 环境：**只调整 UI，不更改焦点/输入法兼容代码**。

- 第一排直接显示「AI 助手 / 改动记录 / 生图」、新对话与设置等按钮。
- 移除原来占高度的品牌/模型 Header；“新版本”提醒仍留在可见导航栏。
- 模型选择移动至**聊天输入框下方工具栏，思考强度左边**，列表向上展开。
- 「刷新模型列表」移到模型下拉菜单的底部，保留原来的刷新事件。
- 「修订模式」用小图标按钮放在图片/附件按钮后；需要接受/回撤已有修订时点旁边的「…」管理按钮。
- 同样作用于 WPS 右侧 TaskPane 和独立 ShowDialog（两者共用 taskpane.html 与 style.css）。

已经扩充 `scripts/linux-sync-installed.sh`，现在会同时同步 `taskpane.html` / `css/style.css` / `app.js` 等文件，保留之前的源码备份与回滚功能。

完成更新后建议运行：

```bash
cd ~/git_soft/WPS-AI
git fetch origin
git switch feature/linux-docked-taskpane
git pull --ff-only
node --test plugin/test/ui-compact.test.js plugin/test/pane-mode.test.js
bash scripts/linux-sync-installed.sh
```

WPS 完全退出后重新打开，依次检查**右侧面板**与**独立弹窗**两种模式，重点测试中文输入、模型切换/刷新、修订开关及接受/回撤操作。若窗口仍缓存老资源，可彻底退出 WPS 再打开，不需要重新打包安装 DEB。

## 选区引用

新增正文右键「引用到灵犀AI」及 Ribbon「文档 → 引用选区」兜底。引用在聊天输入区域上方以灰色折叠卡片呈现，可多次添加、展开和删除，发送问题时才附带完整原文。文档切换后清空待发送引用。Linux 右键菜单和实际 WPS 交互仍需实机验证；完整说明、更新指令和验收项见 [选区引用](quote-selection.md)。


## 2026-10-09：后台卡住恢复与 Linux 弹窗输入

现场曾出现后台进程仍存活、端口仍监听，但 `/healthz` 请求超时，重启用户服务后恢复的情况。旧守护脚本仅检查静态端口，静态服务也只在代理子进程退出时重启它，因此无法处理“进程活着但不响应”。已观察到高 CPU，但缺少当时的调用栈，具体卡死触发原因尚未确定。

静态服务现在在独立进程中检查自己启动的代理子进程：启动宽限 20 秒，每 15 秒请求一次健康接口，单次期限 2 秒，连续 3 次失败后终止该子进程并由原有退出逻辑重新启动；2 秒内不退出则升级为 SIGKILL。检查同时验证服务标识及子进程 PID，实际端口从该子进程启动日志读取，避免因端口回退而误杀其他服务。旧守护脚本的停机清理也覆盖各宿主目录内的代理进程。若代理有持续约一分钟阻塞事件循环的同步任务，自动恢复可能中断其正在执行的请求；此改动不是卡死触发原因的最终修复。

Linux 的润色比对、排版预览、设置、素材库、会话列表等改用已有的页面内弹层；Linux 选区比对保留用户调整的右侧面板宽度。原生 ShowDialog 的打开与父窗口激活可能争抢输入焦点，这里绕开该路径。保留选区快照、生成/确认流程及既有输入法修复，独立聊天窗口入口仍可使用。Windows/macOS 的原生弹窗路径不变。

不用重装 DEB。先保存文档并完全退出 WPS，在本地仓库目录执行：

```bash
git fetch origin
git switch feature/quote-selection
git pull --ff-only
node --test plugin/test/proxy-health-monitor.test.js plugin/test/permanent-proxy-recovery.test.js plugin/test/linux-dialog-routing.test.js plugin/test/linux-source-sync.test.js plugin/test/dialog-focus-install.test.js plugin/test/quote-selection.test.js
bash scripts/linux-sync-installed.sh
systemctl --user restart lingxi-ai.service
```

同步会备份并更新安装根目录及各宿主的服务启动、守护与健康检查源码；不修改 systemd 单元、设置、密钥及会话。回滚仍使用 `bash scripts/linux-restore-last-sync.sh`，之后重启服务、重新打开 WPS。

99 项相关 Node 测试通过，包含真实本地 HTTP 健康探测、模拟代理事件循环卡死与重启、端口回退时保留无关监听进程、Linux 弹层路由、源码同步与回滚。实际 WPS 弹窗输入尚未验证：重开 WPS 后请测试快速润色比对页的英文、中文候选词提交和关闭后聊天框输入，再确认接受/取消不会错误写入正文。


## 2026-10-09：保留手动调整的面板宽度

引用选区和顶栏快捷功能之前每次显示已有 TaskPane 都会重新写入默认宽度，导致用户手动拉宽后又缩回初始尺寸。现在仅新建 TaskPane 时设置默认宽度，引用、润色、重新显示和切回右侧面板都复用已有面板的当前宽度。Linux 页面内预览也不再自动扩宽/关闭后恢复旧宽度，避免干扰用户调整；其他平台原有预览宽度行为保留。此次修复不保证完全退出 WPS 后新建面板仍记住上次尺寸。

更新仍在 `feature/quote-selection` 分支执行 `git pull --ff-only` 和 `bash scripts/linux-sync-installed.sh`，完全退出并重新打开 WPS 后生效。模拟测试覆盖两种引用入口、顶栏润色、隐藏后重开、切回右侧面板及预览开关；实际拖动效果需 WPS 验证。
