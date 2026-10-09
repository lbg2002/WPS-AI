const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
const helper = code.slice(code.indexOf('  function preferInlineWpsDialogs()'), code.indexOf('  function preferFloatingPanel()'));
const fn = code.slice(code.indexOf('  async function openSelectionPreviewAsDialog('), code.indexOf('  function bindSelectionPreviewModal()'));
function load(platform) {
  const calls = { inline: [], native: [], generate: 0, activate: 0 };
  const app = { ShowDialog: (...args) => calls.native.push(args) };
  const sandbox = {
    global: { navigator: { userAgent: platform, platform },
      WpsAiDocument: { getHostInfo: async () => ({ host: 'wps' }) },
      WpsAiHostWriter: {
        readSelectionSnapshot: async () => ({ text: '选中的原文', range: { start: 2, end: 8 }, listFormat: { kind: 'bullet' } }),
        readDocumentContext: async () => ({ title: '标题' }), readDocumentText: async () => '全文',
      },
      WpsAiAddon: { getApplicationSync: () => app, getUrlPath: () => 'http://127.0.0.1:3889/wps' }
    },
    Date, currentHostInfo: null, selectionPreviewState: null,
    SELECTION_PREVIEW_DIALOG_REQUEST_KEY: 'request', SELECTION_PREVIEW_DIALOG_RESULT_KEY: 'result',
    localStorage: { setItem() {}, removeItem() {} },
    openSelectionPreviewInline(request) { calls.inline.push(request); sandbox.selectionPreviewState = { intent: request.intent }; return true; },
    generateSelectionPreview: async () => { calls.generate++; },
    selectionPreviewIntentLabel: () => '润色', i18nDialogTitle: (s) => s,
    pickDialogSize: () => ({ w: 1120, h: 760 }),
    activateWpsApp() { calls.activate++; }, setTimeout() {},
    consumeSelectionPreviewDialogResult: async () => {}, startSelectionPreviewDialogResultPolling() {},
    showMessage(message) { throw new Error(message); }
  };
  vm.runInNewContext(helper + fn, sandbox);
  return { sandbox, calls };
}

test('Linux polish preview uses inline modal, keeps selection snapshot, waits for user generation and never activates document', async () => {
  const { sandbox, calls } = load('Linux x86_64');
  assert.equal(await sandbox.openSelectionPreviewAsDialog({ intent: 'tone', tone: '更正式', instruction: '保持原意' }), true);
  assert.equal(calls.native.length, 0);
  assert.equal(calls.inline.length, 1);
  assert.equal(calls.inline[0].sourceText, '选中的原文');
  assert.deepEqual(calls.inline[0].range, { start: 2, end: 8 });
  assert.deepEqual(calls.inline[0].listFormat, { kind: 'bullet' });
  assert.equal(calls.inline[0].instruction, '保持原意');
  assert.equal(calls.generate, 0);
  assert.equal(calls.activate, 0);
});

test('Linux optimize waits for entered requirements; full-document report also waits for user generation', async () => {
  const { sandbox, calls } = load('Linux');
  await sandbox.openSelectionPreviewAsDialog({ intent: 'optimize' }); assert.equal(calls.generate, 0);
  await sandbox.openSelectionPreviewAsDialog({ intent: 'documentReport', scope: 'document' });
  assert.equal(calls.inline[1].sourceText, '全文'); assert.equal(calls.generate, 0);
});

test('Windows and macOS retain native preview route; unknown platforms retain original choice', async () => {
  for (const platform of ['Win32', 'MacIntel', '']) {
    const { sandbox, calls } = load(platform);
    await sandbox.openSelectionPreviewAsDialog({ intent: 'tone' });
    assert.equal(calls.native.length, 1); assert.equal(calls.inline.length, 0);
  }
});

test('Linux routing guards all app native dialog calls, preserves focus/IME bridge and restores preview width', () => {
  assert.doesNotMatch(code, /if \(app && typeof app.ShowDialog === "function"\) \{/);
  assert.match(code, /typeof app.ShowDialog !== "function" \|\| preferInlineWpsDialogs\(\)/);
  assert.match(code, /if \(!isAnyDialogWindow\(\)\) tryExpandTaskPaneForPreview\(\)/);
  assert.match(code, /if \(!isAnyDialogWindow\(\)\) tryRestoreTaskPaneAfterPreview\(\)/);
  assert.match(code, /installWpsFocusRelease\(\)/);
});
