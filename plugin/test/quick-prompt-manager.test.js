const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function setup() {
  const data = new Map();
  const shared = new Map();
  const fake = {
    location: { pathname: "/taskpane.html" },
    WpsAiStore: {
      getItem: (key) => data.get(key) || null,
      setItem: (key, value) => data.set(key, value)
    },
    WpsAiAddon: {
      getApplicationSync: () => ({
        PluginStorage: {
          getItem: (key) => shared.get(key) || null,
          setItem: (key, value) => shared.set(key, value)
        }
      })
    }
  };
  fake.window = fake;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../js/quick-actions.js"), "utf8"), fake);
  return { api: fake.WpsAiQuickActions, data, shared };
}

test("学术与正式风格修改真正生效于 instruction，保持原调度 flow", () => {
  const { api, data, shared } = setup();
  api.setPrompt("wps", "polishAcademic", "只精炼冗余，严格保持数学公式。");
  const action = api.findByKey("wps", "polishAcademic");
  assert.equal(action.flow, "selectionTone");
  assert.equal(action.instruction, "只精炼冗余，严格保持数学公式。");
  assert.match(action.prompt, /预览/);
  assert.ok(data.has(api.PROMPT_SETTINGS_KEY));
  assert.ok(shared.has(api.PROMPT_SETTINGS_KEY));
  assert.equal(api.findByKey("wps", "polishFormal").instruction, api.getDefaultAction("wps", "polishFormal").instruction);
  api.resetPrompt("wps", "polishAcademic");
  assert.equal(api.findByKey("wps", "polishAcademic").instruction, api.getDefaultAction("wps", "polishAcademic").instruction);
});

test("常规指令覆盖、跨宿主隔离、刷新后可读", () => {
  const { api, data } = setup();
  api.setPrompt("wps", "helpWrite", "写摘要：［主题］");
  api.setPrompt("et", "genFormula", "生成 Excel 公式");
  assert.equal(api.findByKey("wps", "helpWrite").prompt, "写摘要：［主题］");
  assert.equal(api.findByKey("et", "genFormula").prompt, "生成 Excel 公式");
  assert.equal(api.getDefaultAction("wps", "helpWrite").prompt.includes("请帮我写"), true);
  assert.equal(JSON.parse(data.get(api.PROMPT_SETTINGS_KEY)).overrides.et.genFormula, "生成 Excel 公式");
});

test("不可编辑流程不得覆盖，空值和超长指令拒绝", () => {
  const { api } = setup();
  assert.throws(() => api.setPrompt("wps", "quoteSelection", "abc"), /不可修改/);
  assert.throws(() => api.setPrompt("wps", "materialLibrary", "abc"), /不可修改/);
  assert.throws(() => api.setPrompt("wps", "polishAcademic", " "), /不能为空/);
  assert.throws(() => api.setPrompt("wps", "polishAcademic", "x".repeat(api.MAX_PROMPT_LENGTH + 1)), /长度限制/);
  assert.equal(api.getEditableActions("wps").some((a) => a.key === "materialLibrary"), false);
});

test("功能区分组保持固定 key 与默认标签", () => {
  const { api } = setup();
  api.setPrompt("wps", "polishAcademic", "要点化");
  const action = api.getRibbonGroups("wps").flatMap((g) => g.actions).find((a) => a.key === "polishAcademic");
  assert.equal(action.label, "更学术");
});

test("新增设置 UI 与加载入口", () => {
  const html = fs.readFileSync(path.join(__dirname, "../taskpane.html"), "utf8");
  const main = fs.readFileSync(path.join(__dirname, "../main.js"), "utf8");
  assert.match(html, /data-settings-panel="quick-prompts"/);
  for (const id of ["quickPromptEditor", "quickPromptActionList", "quickPromptSave", "quickPromptReset"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(main, /js\/quick-prompt-manager\.js/);
});
