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
