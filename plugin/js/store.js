// WpsAiStore：与 localStorage 同款的同步 KV 面板，内部内存 Map + 启动从 SQLite(代理) 灌入 +
// 写防抖批量回写；代理不可用整体降级 localStorage；首次一次性迁移旧数据。只托管"受管 key"。
(function attachStore(global) {
  "use strict";
  const MIGRATED_FLAG = "__lingxi_kv_migrated_v1";
  const PROVIDER_SETTINGS_KEY = "wps_ai_provider_settings_v1";
  // 受管 key：迁移 + 由 store 托管。跨窗 IPC / 端口 key 不在内。
  const MANAGED_KEYS = [
    "lingxi_conversations_v1", "lingxi_current_conversation_v1",
    "lingxi_history_v1", "lingxi_history_turns_v1",
    "lingxi_material_library_v1",
    "lingxi_skills_user_v1", "lingxi_skills_enabled_v1", "lingxi_skills_cloud_v1",
    "lingxi_html_template_cache_v1", "lingxi_html_components_v1",
    "lingxi_token_usage_v1", "lingxi_doc_report_cache_v1", "lingxi_mindmap_qa_v1",
    "lingxi_models_cache_v1", "lingxi_image_models_cache_v1", "lingxi_model_group_collapsed_v1",
    PROVIDER_SETTINGS_KEY,
    "lingxi_ai_thinking_level_v1", "lingxi_pure_mode",
    "wpsAiChatFoldMiddle", "wpsAiProviderHealthV1",
    "wpsAiCacheAutoCleanPolicy", "wpsAiCacheAutoCleanLastRunAt",
    "lingxi_preview_log_v1", "lingxi_html_preview_chat_log_v1", "lingxi_html_preview_unified_chat_log_v1",
    "lingxi_html_preview_picked_components_v1",
    "lingxi_device_sn_v1", "lingxi_updater_last_check_v1", "wpsAiMcpBridgeToken",
    "lingxi_ui_lang_v1", // 界面语言偏好（i18n）：WPS 的 localStorage 会丢，必须托管进 SQLite
    "lingxi_quick_action_prompts_v1", // 快捷操作可编辑指令
    "lingxi_format_templates_v1", // 自定义排版模板（AI 排版）
    "lingxi_mcp_call_log_v1", // 外部 agent 的 MCP 调用日志（主面板记录，设置窗口读）
    "lingxi_task_store_v1", // 后台长任务状态（P2-1 任务抽象）
    "lingxi_chat_memory_v1", // 跨对话记忆（P2-4）

    "__lingxi_editor_tips_seen__",
    // auth.js OAuth 令牌（与 auth.js STORAGE_KEYS 保持一致）
    "wps_ai_access_token", "wps_ai_refresh_token", "wps_ai_expires_at",
    "wps_ai_code_verifier", "wps_ai_oauth_state"
  ];
  // 迁移成功后从 localStorage 删掉的大/增长键（腾配额）；小标志留着无害
  const LARGE_KEYS_TO_CLEAR = [
    "lingxi_conversations_v1", "lingxi_history_v1", "lingxi_history_turns_v1",
    "lingxi_material_library_v1", "lingxi_skills_user_v1",
    "lingxi_html_template_cache_v1", "lingxi_html_components_v1",
    "lingxi_doc_report_cache_v1", "lingxi_mindmap_qa_v1",
    "lingxi_preview_log_v1", "lingxi_html_preview_chat_log_v1", "lingxi_html_preview_unified_chat_log_v1"
  ];
  // 受管的"小键"：迁移时没从 localStorage 删（留在那儿会变陈旧）。sqlite 模式写入这些键时
  // 同步 write-through 到 localStorage，避免旧副本残留导致回退会话复活旧 auth 令牌（修 I3）。
  const LARGE_SET = new Set(LARGE_KEYS_TO_CLEAR);
  const SMALL_MANAGED = new Set(MANAGED_KEYS.filter((k) => !LARGE_SET.has(k)));
  const NEWLY_MANAGED_BACKFILL_KEYS = [PROVIDER_SETTINGS_KEY, "lingxi_ui_lang_v1", "lingxi_quick_action_prompts_v1"];

  const _map = new Map();
  const _dirty = new Set();
  const _deleted = new Set();
  let _backend = "localStorage"; // "sqlite" | "localStorage" | "unavailable"
  let _flushTimer = null;
  let _readyResolve;
  const ready = new Promise((r) => { _readyResolve = r; });

  function base() { return (global.WpsAiRuntime && global.WpsAiRuntime.proxyBase && global.WpsAiRuntime.proxyBase()) || "http://127.0.0.1:3890"; }
  function ls() { return global.localStorage; }
  function lsGet(key) { try { const v = ls().getItem(key); return v == null ? null : v; } catch (e) { return null; } }
  function later(ms, fn) { return (global.setTimeout || setTimeout)(fn, ms); }
  function isPlainObj(v) { return v && typeof v === "object" && !Array.isArray(v); }

  function getItem(key) { const v = _map.get(key); return v === undefined ? null : v; }
  function setItem(key, value) {
    const v = String(value == null ? "" : value);
    _map.set(key, v);
    if (_backend === "sqlite") {
      _dirty.add(key); _deleted.delete(key); scheduleFlush();
      // 修 I3：小受管键的 localStorage 陈旧副本要同步刷新（大键留 sqlite 独占以省配额）
      if (SMALL_MANAGED.has(key)) { try { ls().setItem(key, v); } catch (e) {} }
    } else if (_backend === "unavailable") {
      // 修 C2：已迁移但代理挂了 —— 绝不写 localStorage（会滞留一份永远到不了 SQLite 的写入），
      // 只标脏 + 一直重试 flush，等代理回来。
      _dirty.add(key); _deleted.delete(key); scheduleFlush();
    } else {
      try { ls().setItem(key, v); } catch (e) { throw e; } // 保留原 QuotaExceeded 行为
    }
  }
  function removeItem(key) {
    _map.delete(key);
    if (_backend === "sqlite") {
      _deleted.add(key); _dirty.delete(key); scheduleFlush();
      if (SMALL_MANAGED.has(key)) { try { ls().removeItem(key); } catch (e) {} } // 修 I3
    } else if (_backend === "unavailable") {
      _deleted.add(key); _dirty.delete(key); scheduleFlush(); // 修 C2：不落 localStorage
    } else {
      try { ls().removeItem(key); } catch (e) {}
    }
  }
  function keys() { return Array.from(_map.keys()); }
  function clear() { keys().forEach(removeItem); }

  function scheduleFlush() { if (_flushTimer) return; _flushTimer = later(500, () => { _flushTimer = null; flush(); }); }

  async function flush() {
    if (_backend !== "sqlite" && _backend !== "unavailable") return;
    if (!_dirty.size && !_deleted.size) return;
    const sets = Array.from(_dirty).map((k) => ({ key: k, value: _map.get(k) }));
    const dels = Array.from(_deleted);
    _dirty.clear(); _deleted.clear();
    try {
      const resp = await global.fetch(base() + "/kv/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sets, dels }) });
      if (!resp || !resp.ok) throw new Error("kv/batch 失败");
      if (_backend === "unavailable") { _backend = "sqlite"; } // 代理回来了 —— 升回 sqlite
    } catch (e) {
      // 重新标脏，并显式重排一次 flush —— 即使之后没有 setItem 也会重试（修 I4）
      sets.forEach((s) => _dirty.add(s.key)); dels.forEach((k) => _deleted.add(k));
      scheduleFlush();
    }
  }

  // 冷启动：代理和 TaskPane 并发启动，代理可能比 TaskPane 晚就绪。
  // 参照 updater.getDeviceSn：立即 + 1500ms + 3000ms 退避重试，别把"未就绪"当"离线"（修 C2a）。
  async function fetchAll() {
    try {
      const resp = await global.fetch(base() + "/kv/all");
      if (resp && resp.ok) { const j = await resp.json(); if (j && j.ok) return j.items || {}; }
    } catch (e) {}
    return null;
  }

  async function init() {
    let items = null;
    const delays = [0, 1500, 3000];
    for (const d of delays) {
      if (d) await new Promise((r) => later(d, r));
      items = await fetchAll();
      if (items) break;
    }
    if (items) {
      _backend = "sqlite";
      for (const k in items) _map.set(k, items[k]);
      await migrateIfNeeded();
      await backfillNewlyManagedKeys();
      // 修 C2b：确保 localStorage 也有迁移标记（老版本可能只写了 SQLite 标记），
      // 否则将来一次"代理挂"的冷启动会误判成"从未迁移"而选 localStorage 后端。
      try { const f = _map.get(MIGRATED_FLAG); if (f != null) ls().setItem(MIGRATED_FLAG, String(f)); } catch (e) {}
    } else {
      // 重试后仍拿不到 /kv/all。看 localStorage 迁移标记判断该进哪种降级。
      const migrated = lsGet(MIGRATED_FLAG);
      if (migrated != null) {
        // 修 C2：已迁移过 → SQLite 才是权威。绝不回写 localStorage（否则 stray 写入永远到不了 SQLite）。
        _backend = "unavailable";
        console.warn("[store] 代理不可用但检测到已迁移：进入 unavailable 只读降级，写入将挂起并持续重试 flush，不落 localStorage。");
      } else {
        // 从未迁移（全新安装 / 真离线）→ 正常 localStorage 后端，写入落 localStorage。
        _backend = "localStorage";
      }
      for (const k of MANAGED_KEYS) { const v = lsGet(k); if (v != null) _map.set(k, v); }
      if (_backend === "unavailable") scheduleFlush(); // armed：代理回来即回刷挂起写入
    }
    try {
      global.addEventListener && global.addEventListener("beforeunload", () => {
        if ((_backend === "sqlite" || _backend === "unavailable") && (_dirty.size || _deleted.size)) {
          const sets = Array.from(_dirty).map((k) => ({ key: k, value: _map.get(k) }));
          const dels = Array.from(_deleted);
          try { global.navigator && global.navigator.sendBeacon && global.navigator.sendBeacon(base() + "/kv/batch", new Blob([JSON.stringify({ sets, dels })], { type: "application/json" })); } catch (e) {}
        }
      });
    } catch (e) {}
    _readyResolve(_backend);
    return _backend;
  }

  async function migrateIfNeeded() {
    if (_map.get(MIGRATED_FLAG)) return; // 已迁移
    const sets = [];
    for (const k of MANAGED_KEYS) {
      try { const v = ls().getItem(k); if (v != null && !_map.has(k)) sets.push({ key: k, value: v }); } catch (e) {}
    }
    const stamp = String(Date.now());
    sets.push({ key: MIGRATED_FLAG, value: stamp });
    try {
      const resp = await global.fetch(base() + "/kv/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sets, dels: [] }) });
      if (!resp || !resp.ok) throw new Error("migrate 失败");
      for (const s of sets) _map.set(s.key, s.value);
      // 修 C2b：迁移标记同时写一份到 localStorage（除 SQLite 外），供代理挂掉时的降级判定。
      try { ls().setItem(MIGRATED_FLAG, stamp); } catch (e) {}
      for (const k of LARGE_KEYS_TO_CLEAR) { try { ls().removeItem(k); } catch (e) {} }
    } catch (e) { /* 失败：没写标记、没删 ls，下次幂等重试 */ }
  }

  async function backfillNewlyManagedKeys() {
    if (_backend !== "sqlite") return;
    const sets = [];
    for (const k of NEWLY_MANAGED_BACKFILL_KEYS) {
      if (_map.has(k)) continue;
      const v = lsGet(k);
      if (v == null) continue;
      _map.set(k, v);
      sets.push({ key: k, value: v });
    }
    if (!sets.length) return;
    try {
      const resp = await global.fetch(base() + "/kv/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sets, dels: [] })
      });
      if (!resp || !resp.ok) throw new Error("backfill 失败");
    } catch (e) {
      sets.forEach((s) => _dirty.add(s.key));
      scheduleFlush();
    }
  }

  // ===== 服务端原子合并的前端入口（修 Critical 1）=====
  // 多宿主共用同一 SQLite；合并放服务端（DB 唯一属主）才不会互相覆盖。sqlite 模式 POST 合并端点
  // 并用返回的权威结果刷新本地 Map；localStorage / unavailable 退回本地"读 Map + 客户端合并 + setItem"。
  function readArr(key) { try { const raw = _map.get(key); const p = raw ? JSON.parse(raw) : []; return Array.isArray(p) ? p : []; } catch (e) { return []; } }
  function readObj(key) { try { const raw = _map.get(key); const p = raw ? JSON.parse(raw) : {}; return isPlainObj(p) ? p : {}; } catch (e) { return {}; } }

  function clientMergeList(cur, items, idKey, tsKey) {
    const byId = new Map();
    for (const it of (cur || [])) { if (it && it[idKey] != null) byId.set(it[idKey], it); }
    for (const it of (items || [])) {
      if (!it || it[idKey] == null) continue;
      const prev = byId.get(it[idKey]);
      if (!prev) { byId.set(it[idKey], it); continue; }
      if (!tsKey) { byId.set(it[idKey], it); continue; }
      if ((Number(it[tsKey]) || 0) >= (Number(prev[tsKey]) || 0)) byId.set(it[idKey], it);
    }
    let merged = Array.from(byId.values());
    if (tsKey) merged.sort((a, b) => (Number(a[tsKey]) || 0) - (Number(b[tsKey]) || 0));
    return merged;
  }
  function clientAssign(a, b) {
    const out = Object.assign({}, a);
    for (const k of Object.keys(b || {})) {
      if (isPlainObj(out[k]) && isPlainObj(b[k])) out[k] = clientAssign(out[k], b[k]);
      else out[k] = b[k];
    }
    return out;
  }
  function clientAdd(a, b) {
    const out = Object.assign({}, a);
    for (const k of Object.keys(b || {})) {
      const av = out[k], bv = b[k];
      if (typeof av === "number" && typeof bv === "number") out[k] = (k === "lastAt") ? Math.max(av, bv) : av + bv;
      else if (isPlainObj(av) && isPlainObj(bv)) out[k] = clientAdd(av, bv);
      else out[k] = bv;
    }
    return out;
  }

  async function mergeList(key, items, idKey, tsKey) {
    if (_backend === "sqlite") {
      try {
        const resp = await global.fetch(base() + "/kv/merge-list", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, items: items || [], idKey, tsKey }) });
        if (resp && resp.ok) { const j = await resp.json(); if (j && j.ok && Array.isArray(j.merged)) { _map.set(key, JSON.stringify(j.merged)); return j.merged; } }
        throw new Error("merge-list 失败");
      } catch (e) { /* 代理异常 → 落回客户端合并 */ }
    }
    const merged = clientMergeList(readArr(key), items || [], idKey, tsKey);
    setItem(key, JSON.stringify(merged)); // localStorage / unavailable 路径（可能抛 Quota，交给调用方）
    return merged;
  }

  async function mergeObject(key, patch, mode) {
    const m = mode === "add" ? "add" : "assign";
    if (_backend === "sqlite") {
      try {
        const resp = await global.fetch(base() + "/kv/merge-object", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, patch: patch || {}, mode: m }) });
        if (resp && resp.ok) { const j = await resp.json(); if (j && j.ok && isPlainObj(j.merged)) { _map.set(key, JSON.stringify(j.merged)); return j.merged; } }
        throw new Error("merge-object 失败");
      } catch (e) { /* 落回客户端合并 */ }
    }
    const merged = m === "add" ? clientAdd(readObj(key), patch || {}) : clientAssign(readObj(key), patch || {});
    setItem(key, JSON.stringify(merged));
    return merged;
  }

  global.WpsAiStore = { getItem, setItem, removeItem, clear, keys, init, ready, flush, mergeList, mergeObject };
})(window);
