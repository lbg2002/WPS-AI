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
