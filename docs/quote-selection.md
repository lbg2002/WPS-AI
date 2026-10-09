# WPS 文字：引用选区到灵犀AI

此功能基于 `feature/linux-docked-taskpane`，开发分支为 `feature/quote-selection`。

## 使用

1. 保存文字文档，选中正文文字，右键选择 **引用到灵犀AI**。
2. 若当前 WPS 没有显示该右键项，使用顶部 **灵犀AI → 文档 → 引用选区**。两者调用同一入口。
3. 在当前显示方式的聊天输入框上方查看灰色引用卡片。默认折叠，点击摘要展开全文，点击 × 删除。可重复选择并添加多个片段。
4. 输入问题并点击发送。添加引用本身不调用模型、不改正文、不替换输入框内容。只添加引用而没有问题时不会发送。

选区保存原始完整文字，包括换行及首尾空白。摘要仅显示约 80 个字符；摘要长度不影响模型收到的全文。发送时以 JSON 的 `quotedSelections: [{index, text}, ...]` 与 `question` 组合，并继续使用原来的 `runChatTurn`、附件、模型供应商、会话存储与工具调用流程。已接受的引用从输入区移除；模型配置等前置检查失败时保留卡片。聊天历史保存包含引用的完整用户消息。

带引用的问题跳过全文改写意图和本地即时指令匹配，交给模型按问题处理；普通聊天和 Ribbon 原有快捷操作保留原路线。未改动原有输入法焦点修复、模型选择/刷新、临时模型、会话接口及工具执行器。

## 文档与窗口隔离

- 在 Ribbon 回调侧先用已有 WPS JSAPI `Application.Selection.Text`（兼容 `Selection.Range.Text`、Range 方法与 Promise 属性）抓取选区，再打开面板，避免打开 WebView 后读到错误选区。
- 独立引用队列 `lingxi_ai_quote_queue_v1` 使用 PluginStorage，不占用原来的 `lingxi_ai_pending_action` 单项快捷操作槽。多个选区不会互相覆盖，同一毫秒触发也有独立 ID。
- 用文字文档绝对 `FullName` 关联引用，不使用可能重名的 `Name`。未保存到磁盘、没有可识别路径的文档会提示先保存；原有打开面板/弹窗及发送时的保存检查仍适用。
- 聊天页约每 800ms 校验当前文档；切换文档、关闭文档或另存为其他路径后清空未发送引用。发送前再次校验，发现文档变化则拒绝本轮引用发送。已经发送的引用属于原会话历史；本功能不改变原有会话关联策略。
- 只由上次选择的 docked/dialog 主聊天页消费队列；设置、预览、历史窗口不消费。失配文档请求被丢弃，队列请求 10 分钟后失效。卡片仅在聊天页内存中保存，重载网页后不会恢复。
- 独立弹窗以聊天页心跳判断是否已打开，优先复用已存在窗口。WPS 若暂停后台页面计时器超过 3 秒，心跳不能可靠证明窗口仍在，可能再次打开弹窗；没有伪称存在可靠的 ShowDialog 窗口管理 API。

## Linux 右键兼容性

生成器仅给文字宿主追加 `contextMenus / ContextMenuText`，并生成独立的菜单回调，同时保留原有 Ribbon 命名空间与生成逻辑。表格、演示和 PDF 不生成文字引用入口。**尚未实机验证 Linux WPS 的 ContextMenuText 支持、选区读取和面板/弹窗投递，右键项出现不是承诺。** 如果 WPS 忽略该扩展，直接使用 Ribbon「引用选区」。

WPS 官方 Selection 对象文档：
https://open.wps.cn/documents/app-integration-dev/wps365/client/wpsoffice/jsapi/wps/Selection/obj

## 更新已有 Linux 安装

在本地 WPS-AI 仓库根目录执行（先保存自己的未提交修改）：

```bash
git fetch origin
git switch feature/quote-selection
# 若本地尚无该分支，改用：
# git switch --track -c feature/quote-selection origin/feature/quote-selection
git pull --ff-only origin feature/quote-selection

# 专项测试；建议 Node.js 24。
node --test plugin/test/quote-selection.test.js plugin/test/ribbon-callbacks.test.js plugin/test/linux-source-sync.test.js plugin/test/pane-mode.test.js plugin/test/ui-compact.test.js plugin/test/dialog-focus-install.test.js plugin/test/edit-shortcuts.test.js

# 全量测试（已有失败/未退出计时器的情况见下方验证记录）。
node --test plugin/test/*.test.js

bash scripts/linux-sync-installed.sh
```

`origin` 应指向自己的 `lbg2002/WPS-AI` Fork。若已有本地同名分支但未关联远端，可先执行 `git branch --set-upstream-to=origin/feature/quote-selection feature/quote-selection`。

同步脚本现在会同时部署 `main.js`、`js/quote-selection.js`、`js/quick-actions.js`、聊天 HTML/CSS、app、adapter、i18n 和各宿主生成文件。新文件也会安装，原文件先备份，回滚时删除新文件并恢复原文件。脚本恢复仓库内原来的生成文件；设置、凭据、对话数据库及 WPS publish.xml 不在复制清单内。测试可用 `LINGXI_INSTALL_DIR` 指定临时目录，不需要操作真实安装。

**完全退出 WPS 后重新打开**，再执行上述使用流程。不需要重新构建 DEB。回滚：

```bash
bash scripts/linux-restore-last-sync.sh
```

## 实机验收清单（待用户执行）

- 已保存正文选中中文及跨段落文字：右键项是否显示；不显示时 Ribbon 是否能添加同样引用。
- 面板打开和关闭两种状态，连续添加两个不同选区：是否出现两个折叠卡片、展开全文完整、单项删除有效、没有自动发送或正文写入。
- 切为独立弹窗，添加多个引用：优先复用当前弹窗；关闭后再次引用能重新打开。
- 输入问题发送，确认供应商请求包含完整选区与问题；附带文本/图片/PDF 时仍走原来的附件流程；工具调用和历史会话可继续使用。
- 添加引用后迅速切换到另一篇文档、关闭文档或另存为，再发送：引用不得进入新文档的问题；普通问题不受影响。
- 中文输入、Fcitx5 候选提交、模型选择与刷新、临时模型、修订开关保持可用。

## 自动验证记录

验证在代码环境及模拟宿主中执行，不等于实机 WPS 验收。专项测试覆盖完整长文本、空选区、Range/Promise 兼容、多项队列、去重、文档切换、发送前校验、前置失败保留卡片、结构化消息与文本附件、折叠/删除/安全文本渲染、窗口分发/弹窗复用、各宿主 Ribbon 生成以及源码同步/回滚。2026-10-09，Node.js 24.19.0：引用/Ribbon/同步/面板/布局/输入焦点专项 74 项全部通过；JS 语法、Shell 语法与 `git diff --check` 通过。

全量 `node --test` 尝试因已有未退出计时器无法正常结束，随后逐文件运行并设置每文件 18 秒外部超时：本分支 122/129 个文件通过，原分支快照 120/127 个文件通过。两边同样有 5 个失败文件：`chat-process-avatar.test.js`、`i18n-coverage.test.js`、`multimodal-error.test.js`、`openai-provider-ollama.test.js`、`pick-node.test.js`；同样有 2 个超时文件：`i18n.test.js`、`image-provider-boogu.test.js`。这些失败/超时已在基线 commit `4703e0a` 复现，未宣称全量通过。
