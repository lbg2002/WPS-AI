# Linux 中文输入法兼容性实验

问题：WPS Linux 加载项的 `textarea` 可输入英文，但无法正常使用中文输入法。
此分支是**待实机验证**的最小补丁，不承诺解决所有 IBus/Fcitx/Wayland 问题。

## 已做修改

- 在 `plugin/js/app.js` 中跟踪 `compositionstart` / `compositionend`。
- 预编辑期间跳过 WPS `CommandBars.ReleaseFocus()` 和 `window.focus()`。
- 同一次鼠标点击不再通过 `pointerdown` 与 `focusin` 重复释放焦点。
- 可选调试开关 `localStorage.lingxi_ime_debug=1`，仅记录事件类型、输入框 ID，不记录实际输入文字。
- 可选排障开关 `localStorage.lingxi_ime_disable_focus_release=1`：完全停用 WPS 焦点释放作对照测试；可能导致快捷键被文档抢走，测试后记得关闭。

## 不需要重新构建 DEB

系统已装 `lingxi-ai_1.4.7_amd64.deb` 后，源代码从你的 Fork 同步：

```bash
git clone https://github.com/lbg2002/WPS-AI.git
cd WPS-AI
git switch fix/linux-ime-composition
bash scripts/linux-sync-installed.sh
```

原脚本目录结构：`~/.lingxi-ai/plugin-{wps,et,wpp,pdf}/`；
静态服务器会通过本地 `http://127.0.0.1:3889/wps/` 读取这些文件。
完全退出 WPS 后重新打开即可。同步脚本自动备份原始 `app.js`。
**不要直接在 `plugin` 目录执行 `npm run dev`：当前 Linux dev.js 会覆盖 WPS 共用 publish.xml。**

如果想从克隆的代码持续开发，可运行同一脚本将修改重新同步；当前脚本特意只替换 `app.js`，避免覆盖生产插件设置、manifest 和服务文件。其他源码修改需单独同步或补充安全的增量同步流程。

## 判断是否有改善

1. 先在原生 WPS 正文确认中文输入正常，再分别测试插件中聊天框、设置窗口的输入框。
2. 分别测试拼音输入、候选词选择、空格提交、Enter 提交、Shift+Enter 换行、Ctrl+A/C/V。
3. 若依然无法输入，使用 WPS F12 开发者工具运行 `localStorage.setItem("lingxi_ime_debug","1")` 并重开插件，查看控制台 `[lingxi-ime]` 事件。
4. 用 `localStorage.setItem("lingxi_ime_disable_focus_release","1")` 进行 A/B 对照测试，刷新插件后再尝试中文；测试完 `localStorage.removeItem("lingxi_ime_disable_focus_release")`。
5. 在终端运行 `echo "$XDG_SESSION_TYPE"; echo "$XMODIFIERS"; echo "$QT_IM_MODULE"; echo "$GTK_IM_MODULE"; pgrep -a -f 'ibus-daemon|fcitx5'` 确认输入法环境。

如果所有预编辑事件都未出现，原因很可能在 WPS 嵌入式 WebView/Qt 原生输入法接口，不是普通 DOM 键盘事件，前端补丁无法确保解决。

> 安全提示：勿将 API Key、含未公开论文内容的对话、完整开发者工具网络日志提交到公开 GitHub Issue。
