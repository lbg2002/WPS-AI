const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  buildRibbon,
  buildRibbonCallbackScript,
  loadQuickActions
} = require("../tools/gen-ribbon.js");

const pluginRoot = path.resolve(__dirname, "..");
const qa = loadQuickActions();

for (const host of ["wps", "et", "wpp", "pdf"]) {
  test(`Ribbon ${host}: provides docked and floating dialog actions`, () => {
    const xml = buildRibbon(host, qa);
    const callbacks = buildRibbonCallbackScript(host, qa);
    for (const action of ["openWpsAiPane", "openWpsAiDocked", "openWpsAiDialog"]) {
      assert.match(xml, new RegExp(`id="${action}"`));
      assert.match(xml, new RegExp(`onAction="OnAction_${action}"`));
      assert.match(callbacks, new RegExp(`bindAction\\("OnAction_${action}", "${action}"\\)`));
    }
    assert.match(xml, /id="openWpsAiDocked" label="右侧面板"/);
    assert.match(xml, /id="openWpsAiDialog" label="独立弹窗"/);
  });
}

test("committed WPS ribbon and callbacks match generator", () => {
  assert.equal(
    fs.readFileSync(path.join(pluginRoot, "ribbon.xml"), "utf8"),
    buildRibbon("wps", qa)
  );
  assert.equal(
    fs.readFileSync(path.join(pluginRoot, "js/ribbon-callbacks.generated.js"), "utf8"),
    buildRibbonCallbackScript("wps", qa)
  );
});

test("Linux display mode defaults to docked while retaining dialog fallback", () => {
  const source = fs.readFileSync(path.join(pluginRoot, "js/wps-addon-adapter.js"), "utf8");
  assert.match(source, /PANE_MODE_STORAGE_KEY\s*=\s*"lingxi_ai_pane_mode_v1"/);
  assert.match(source, /function getPreferredPaneMode\(/);
  assert.match(source, /return "docked";/);
  assert.match(source, /id === "openWpsAiDocked"/);
  assert.match(source, /id === "openWpsAiDialog"/);
  assert.match(source, /return openTaskPaneAsDialog\(\);/);
});

test("simulated Linux WPS: dock by default, switch to dialog, remember mode, restore dock", () => {
  const storage = new Map();
  const local = new Map();
  const panes = new Map();
  const dialogs = [];
  const app = {
    ActiveDocument: { FullName: "/tmp/academic-paper.docx", Saved: true },
    PluginStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, value); },
      removeItem(key) { storage.delete(key); }
    },
    CreateTaskPane(url) {
      const pane = { ID: "pane-1", Visible: false, DockPosition: 4, Width: 400 };
      panes.set(pane.ID, pane);
      return pane;
    },
    GetTaskPane(id) { return panes.get(id) || null; },
    ShowDialog(url) { dialogs.push(url); return true; }
  };
  const win = {
    Application: app,
    navigator: { userAgent: "Mozilla/5.0 (X11; Linux x86_64)", platform: "Linux x86_64" },
    location: { pathname: "/index.html" },
    localStorage: {
      getItem(key) { return local.get(key) || null; },
      setItem(key, value) { local.set(key, value); }
    },
    screen: { availWidth: 1920, availHeight: 1080 },
    __lingxiTraceStatic() {}
  };
  const doc = {
    location: { toString: () => "http://127.0.0.1:3889/wps/index.html" },
    addEventListener() {}
  };
  const adapter = fs.readFileSync(path.join(pluginRoot, "js/wps-addon-adapter.js"), "utf8");
  new Function("window", "document", "fetch", "Image", "setTimeout", "clearTimeout", "console", adapter)(
    win, doc, () => Promise.resolve({ ok: true }), function Image() {}, () => 0, () => {},
    { log() {}, warn() {}, info() {}, error() {} }
  );
  win.OnAction("openWpsAiPane");
  assert.equal(panes.get("pane-1")?.Visible, true);
  assert.equal(dialogs.length, 0);
  win.OnAction("openWpsAiDialog");
  assert.equal(panes.get("pane-1")?.Visible, false);
  assert.equal(dialogs.length, 1);
  assert.equal(storage.get("lingxi_ai_pane_mode_v1"), "dialog");
  win.OnAction("openWpsAiPane");
  assert.equal(dialogs.length, 2, "main button should use remembered dialog mode");
  win.OnAction("openWpsAiDocked");
  assert.equal(panes.get("pane-1")?.Visible, true);
  assert.equal(storage.get("lingxi_ai_pane_mode_v1"), "docked");
});
