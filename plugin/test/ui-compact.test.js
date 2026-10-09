const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "taskpane.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");

function indexOfUniqueId(id) {
  const re = new RegExp('id="' + id + '"', "g");
  const matches = Array.from(html.matchAll(re));
  assert.equal(matches.length, 1, id + " must be unique");
  return matches[0].index;
}

test("compact composer keeps a single model selector inside input toolbar", () => {
  const headerEnd = html.indexOf("</header>");
  const toolbar = html.indexOf('<div class="chat-input-toolbar">');
  const model = indexOfUniqueId("modelSelectBtn");
  const popup = indexOfUniqueId("modelSelectPopup");
  const options = html.indexOf('class="model-select-options"');
  const refresh = indexOfUniqueId("refreshModelsBtn");
  const thinking = indexOfUniqueId("capThinking");
  assert.ok(model > toolbar && model > headerEnd && model < thinking);
  assert.ok(popup > model && options > popup && refresh > options && refresh < thinking);
  assert.match(html.slice(options, thinking), /刷新模型列表/);
  assert.match(css, /\.app-header\s*\{\s*display:\s*none\s*!important/);
  assert.match(css, /\.chat-input-toolbar \.model-select-popup\s*\{/);
  assert.match(css, /bottom:\s*calc\(100% \+ 8px\)/);
});

test("revision switch stays by attachment icons; manage options retained", () => {
  const toolbar = html.indexOf('<div class="chat-input-toolbar">');
  const image = indexOfUniqueId("capImage");
  const revision = indexOfUniqueId("reviseModeToggle");
  const reviseMenu = indexOfUniqueId("reviseModeActions");
  const model = indexOfUniqueId("modelSelectBtn");
  assert.ok(toolbar >= 0 && toolbar < image && image < revision && revision < reviseMenu && reviseMenu < model);
  assert.ok(indexOfUniqueId("reviseManageBtn") > revision);
  indexOfUniqueId("reviseAcceptAllBtn");
  indexOfUniqueId("reviseRejectAllBtn");
  assert.match(app, /els\.reviseManageBtn\?\.addEventListener\("click"/);
  assert.match(app, /els\.reviseManageBtn\?\.classList\.toggle\("hidden", !\(n > 0\)\)/);
});

test("model list redraw preserves footer button and click handler", () => {
  const renderStart = app.indexOf("function renderMultiModelPopup(");
  const renderEnd = app.indexOf("// 模型下拉：按供应商折叠状态", renderStart);
  assert.ok(renderStart > 0 && renderEnd > renderStart);
  const fn = app.slice(renderStart, renderEnd);
  assert.match(fn, /querySelector\("\.model-select-options"\)/);
  assert.match(fn, /optionList\.innerHTML = ""/);
  assert.doesNotMatch(fn, /els\.modelSelectPopup\.innerHTML\s*=/);
  assert.match(app, /els\.refreshModelsBtn\.addEventListener\("click", refreshModels\)/);
  assert.match(html, /id="refreshModelsBtn"[\s\S]*?<span>刷新模型列表<\/span>/);
});

test("large browser scripts still parse after compact UI changes", () => {
  assert.doesNotThrow(() => new vm.Script(app, { filename: "app.js" }));
});
