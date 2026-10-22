(function attachQuickPromptManager(global) {
  "use strict";
  const API = () => global.WpsAiQuickActions;
  const $ = (id) => document.getElementById(id);
  const escape = (s) => String(s || "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const HOSTS = { wps: "文字", et: "表格", wpp: "演示", pdf: "PDF" };
  let selected = "wps";
  let activeKey = "";
  let dirty = false;

  function actions() {
    const api = API();
    const term = ($("quickPromptSearch")?.value || "").trim().toLowerCase();
    return api.getEditableActions(selected).filter((a) =>
      !term || [a.label, a.key, api.CATEGORY_LABELS[a.category]].some((v) => String(v || "").toLowerCase().includes(term)));
  }
  function activeAction() {
    return API()?.getDefaultAction(selected, activeKey);
  }
  function customized(key) {
    return !!API()?.getConfig().overrides?.[selected]?.[key];
  }
  function saveChanges() {
    const a = activeAction();
    if (!a || !dirty) return true;
    const input = $("quickPromptEditor");
    try {
      API().setPrompt(selected, activeKey, input.value);
      dirty = false;
      showStatus("已保存");
      return true;
    } catch (error) {
      showStatus(error?.message || "保存失败", true);
      input?.focus();
      return false;
    }
  }
  function showStatus(message, error) {
    const el = $("quickPromptManagerStatus");
    if (!el) return;
    el.textContent = message || "";
    el.classList.toggle("is-error", !!error);
  }
  function renderList() {
    const holder = $("quickPromptActionList");
    if (!holder) return;
    holder.innerHTML = actions().map((a) =>
      '<button type="button" class="quick-pm-item' + (a.key === activeKey ? " active" : "") +
      '" data-action-key="' + escape(a.key) + '"><span>' + escape(a.label) + '</span>' +
      (customized(a.key) ? '<i>已修改</i>' : "") + '</button>').join("");
    if (!holder.childNodes.length) holder.innerHTML = '<div class="quick-pm-empty">没有匹配的快捷功能</div>';
  }
  function renderEditor() {
    const a = activeAction();
    const empty = $("quickPromptEditorEmpty");
    const editor = $("quickPromptEditorArea");
    if (empty) empty.classList.toggle("hidden", !!a);
    if (editor) editor.classList.toggle("hidden", !a);
    if (!a) return;
    $("quickPromptEditorTitle").textContent = a.label;
    $("quickPromptEditor").value = API().findByKey(selected, activeKey)[API().editableField(a)] || "";
    $("quickPromptEditor").maxLength = API().MAX_PROMPT_LENGTH;
    $("quickPromptReset").disabled = !customized(a.key);
    dirty = false;
    showStatus("");
    renderList();
  }
  function switchAction(key) {
    if (dirty && !saveChanges()) return;
    activeKey = key;
    renderEditor();
  }
  function switchHost(host) {
    if (!Object.hasOwn(HOSTS, host) || (dirty && !saveChanges())) return;
    selected = host;
    activeKey = API().getEditableActions(selected)[0]?.key || "";
    $("quickPromptSearch").value = "";
    document.querySelectorAll("[data-quick-pm-host]").forEach((el) =>
      el.classList.toggle("active", el.dataset.quickPmHost === host));
    renderList();
    renderEditor();
  }
  function init() {
    if (!$("quickPromptActionList") || !API()) return;
    const initAfterStore = global.WpsAiStore?.ready || Promise.resolve();
    initAfterStore.then(() => {
      selected = "wps";
      activeKey = API().getEditableActions(selected)[0]?.key || "";
      switchHost(selected);
    });
    document.querySelectorAll("[data-quick-pm-host]").forEach((btn) =>
      btn.addEventListener("click", () => switchHost(btn.dataset.quickPmHost)));
    $("quickPromptActionList").addEventListener("click", (event) => {
      const btn = event.target.closest("[data-action-key]");
      if (btn) switchAction(btn.dataset.actionKey);
    });
    $("quickPromptSearch").addEventListener("input", renderList);
    $("quickPromptEditor").addEventListener("input", () => {
      dirty = true;
      showStatus("未保存");
    });
    $("quickPromptSave").addEventListener("click", () => {
      if (saveChanges()) { renderList(); renderEditor(); }
    });
    $("quickPromptReset").addEventListener("click", () => {
      if (!activeAction()) return;
      try {
        API().resetPrompt(selected, activeKey);
        renderList();
        renderEditor();
        showStatus("已恢复默认");
      } catch (error) { showStatus(error?.message || "恢复失败", true); }
    });
    // 设置面板切换或关闭时保存，避免编辑中的提示词被意外丢弃。
    document.querySelectorAll("#settingsModal [data-settings-panel], #settingsModal [data-close-modal], #settingsModalCloseBtn")
      .forEach((el) => el.addEventListener("click", () => { if (dirty) saveChanges(); }));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
