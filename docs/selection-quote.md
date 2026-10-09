# WPS 文字：正文选区引用到灵犀AI（实验功能）

基于 `feature/linux-docked-taskpane`，只扩展 WPS 文字宿主；保留已修复的 Fcitx5 中文输入、右侧嵌入/独立弹窗切换、简洁布局与原有模型配置。

## 使用方式

1. 保存论文为本地 DOCX；在正文中选中一段文字。
2. 在选区右键菜单中点击 **引用到灵犀AI**。如果 Linux WPS 未显示自定义右键菜单，使用顶部 **灵犀AI → 引用选区** 备用按钮。
3. 插件读取 `Application.Selection.Text` 的纯文本快照，存入 WPS `PluginStorage` 的一次性队列，按当前显示偏好打开右侧面板/独立弹窗。
4. 聊天输入框上方显示灰色引用卡片，默认折叠，只显示摘要。点击卡片可展开全文，点击 × 可以移除。可以连续添加最多 **8** 段引用。
5. 在聊天框输入问题再发送；聊天模型接收到**问题和全部引用全文**，引用数据明确标记为非指令，不会因引用动作自行调用 AI 或写文档。

## 安全和限制

- 每次最多 20000 字，总引用 50000 字；引用队列 60 秒过期。
- 引用要求源文档已有磁盘路径，用来识别所属文件；不要求引用时立即自动保存。
- 仅在当前文件标识匹配时接收引用；切换文件会清空本窗口尚未发送的引用草稿，避免跨文档误用。
- 引用纯文字快照，不保留公式对象、图片、批注锚点和富文本格式；引用后继续改正文不会自动同步快照。
- WPS Linux 自定义右键菜单 `ContextMenuText` 可能因版本、拼写检查或特定段落结构不显示。Ribbon 入口作为保底。
- 只在用户**发送提问**时，把引文一起发送给配置的模型 API。论文的未公开内容是否传输至第三方 API，仍取决于你原有模型配置和操作。
- 同时打开浮窗和嵌入面板时，队列按上次选定的窗口模式优先投递，建议只保持一个主聊天窗口可见。

## 无需重编 DEB，直接同步

退出所有 WPS 窗口后运行：

```bash
cd ~/git_soft/WPS-AI
git status --short
git fetch origin
git switch feature/selection-quote
git pull --ff-only origin feature/selection-quote
node --test plugin/test/selection-quote.test.js plugin/test/pane-mode.test.js plugin/test/ui-compact.test.js
bash scripts/linux-sync-installed.sh
```

新加的 `js/selection-quotes.js` 会在同步时安全创建，其他被覆盖的已安装文件会备份到 `~/.lingxi-ai/source-backups/`。更新脚本不会重写 WPS 共用的 `publish.xml`、模型配置、对话历史、系统 DEB 或已安装的代理服务。重启 WPS 后，新 Ribbon 和右键菜单才会加载。

### 回滚

退出 WPS，执行：

```bash
cd ~/git_soft/WPS-AI
bash scripts/linux-restore-last-sync.sh
```

旧文件会从最近快照恢复。新建的帮助模块可能留在插件目录，但旧版 `main.js` 不再加载它；无需删除用户配置目录。

## 手工验收

- 用一句正文选区右键引用；看灰色卡片是否出现，切换展开/收起/删除。
- 再引用第二段；输入“比较这两段的论证逻辑”，检查发送文本和模型回答是否引用全文。
- 使用功能区备用按钮重复测试；无选区时应显示提示，不创建空引用。
- 切换到另一份 DOCX：原草稿应清空；不能带入第二份文档。
- 测试中文输入、Ctrl+C/V、思考强度、模型下拉和刷新是否正常。
- 分别在右侧面板、独立弹窗验证；如右键菜单缺失请报告 WPS 版本和 X11/Fcitx5 诊断信息。
