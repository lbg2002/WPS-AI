<div align="center">

# 🪄 Lingxi AI · WPS Office Assistant

**Bring your own AI models to WPS Writer, Spreadsheets, Presentation and PDF.**

[![Release](https://img.shields.io/github/v/release/lbg2002/WPS-AI?label=Latest%20release&color=5589e8)](https://github.com/lbg2002/WPS-AI/releases/latest)
![Platforms](https://img.shields.io/badge/Builds-Windows%20%7C%20Linux-3971ac)
![License](https://img.shields.io/badge/License-MIT-3c9b78)

[**Download v1.4.9**](https://github.com/lbg2002/WPS-AI/releases/tag/v1.4.9) · [中文说明](README.md) · [Installation guide](INSTALL.md) · [Changelog](CHANGELOG.md)

<p>
  <img src="img/1.png" width="32%" alt="Existing WPS AI interface screenshot"/>
  <img src="img/2.png" width="32%" alt="Existing WPS AI document assistant screenshot"/>
  <img src="img/3.png" width="32%" alt="Existing WPS AI model configuration screenshot"/>
</p>
<sub>Screenshots from earlier versions; the new Quick Prompts settings panel is not depicted.</sub>

</div>

> **About this fork:** This is the community fork `lbg2002/WPS-AI`, with Linux TaskPane improvements, document-selection quotation, prompt customization and UI fixes. Its binaries are **not** interchangeable with the upstream project's downloads. This fork currently publishes **Windows x64** and **Linux x64/ARM64** packages; it does **not** publish a macOS installer.

## 📦 Download

| Platform | Installer | Link |
|---|---|---|
| Windows 10/11 x64 | `lingxi-ai-1.4.9-setup.exe` | [EXE](https://github.com/lbg2002/WPS-AI/releases/download/v1.4.9/lingxi-ai-1.4.9-setup.exe) |
| Ubuntu / Debian x64 | `lingxi-ai_1.4.9_amd64.deb` | [DEB](https://github.com/lbg2002/WPS-AI/releases/download/v1.4.9/lingxi-ai_1.4.9_amd64.deb) |
| Ubuntu / Debian ARM64 | `lingxi-ai_1.4.9_arm64.deb` | [DEB](https://github.com/lbg2002/WPS-AI/releases/download/v1.4.9/lingxi-ai_1.4.9_arm64.deb) |
| Linux x64 / ARM64 | Portable `.tar.gz` installers | [Release assets and checksums](https://github.com/lbg2002/WPS-AI/releases/tag/v1.4.9) |

Installers bundle a compatible portable Node runtime. **Save documents and fully quit WPS before upgrading**, then restart WPS. Windows installers are not code-signed. All downloads should be taken from this fork's own GitHub Releases and checked against `SHA256SUMS`.

For Ubuntu / Debian, install the matching DEB, e.g.:

```bash
sudo apt install ./lingxi-ai_1.4.9_amd64.deb
```

For portable Linux installs, extract the architecture-specific `.tar.gz` and run `bash install.sh` as your desktop user. See [INSTALL.md](INSTALL.md) and [Chinese Linux deployment details](README.md#-部署与无网安装).

## ✍️ New in v1.4.9: Manage Quick Action Prompts

**Settings → Quick Prompts** now lets you customize the instructions behind ribbon actions like **More academic**, **More formal**, **Polish**, **Expand**, and many more without editing JavaScript.

1. Open the **Lingxi AI** pane and click **Settings → Quick Prompts**.
2. Select a host (**Writer / Spreadsheet / Presentation / PDF**), then select or search for a ribbon action.
3. Edit the instruction and click **Save**; future executions of that action use your custom prompt. **Reset to default** restores the built-in instruction for that action.

The customization changes the **actual business instruction** (including `instruction` for selection rewrite operations), not the fixed routing flow. Selection previews, difference highlighting and explicit replacement confirmation stay in place. Preferences are persisted using the existing plugin storage and separated by Office host. Actions that only open a modal are intentionally not editable.

## ✨ Features

| Area | Capabilities |
|---|---|
| **AI chat** | Codex, OpenAI-compatible endpoints, Anthropic, native Gemini, Azure OpenAI, generic OpenAI Responses, and local Ollama |
| **WPS Writer** | Quoted selections, AI drafting, rewriting and proofreading; original vs. rewritten text previews |
| **Spreadsheets** | Read and write cells/ranges, generate formulas, formatting and chart operations |
| **Presentation** | AI-supported slide generation, layouts, templates, visual editor and presenter notes |
| **PDF** | Summarization, Q&A and side-by-side translation |
| **Workflows** | Multiple providers, tool calls, configurable system prompts, custom Skills and MCP connectors |
| **Safety** | Preview/confirm or direct-write modes, plus a document change history and backups |

You can configure several AI providers and switch between models. Cloud providers require network access and valid credentials; **installing the plugin alone does not provide an offline AI model**. A previously installed local Ollama model or a reachable intranet model can support local inference.

## ⚡ Quick start

1. Install the matching fork Release and restart WPS.
2. Open the **Lingxi AI** ribbon tab and choose the right-side pane.
3. Open **Settings → Chat Models**, add an AI provider, enter its API key or use the appropriate OAuth option, and test the connection.
4. Select the model in the chat UI, then ask a question or use a ribbon quick action.

Use **Settings → General** for the system prompt and tool behavior; use **Settings → Quick Prompts** for action-specific instructions.

## 🧱 Architecture

```text
WPS Writer / Spreadsheets / Presentation / PDF
    │  WPS JSAPI
    ├─ TaskPane / Settings (quick-prompt-manager.js)
    ├─ Ribbon quick actions (quick-actions.js)
    └─ local proxy server (Node.js, loopback)
          ├─ AI provider APIs / local LLMs
          └─ optional MCP connections
```

The plugin uses local loopback HTTP ports, usually 3889 for its UI and 3890 for the proxy. It does not need a public hostname or internet-exposed port. Using cloud models still requires their network endpoints.

## 🛠 Development & tests

```bash
cd plugin
npm install
npm run dev:wps   # alternatively dev:et / dev:wpp / dev:pdf
node --test test/quick-prompt-manager.test.js
```

New ribbon definitions belong in `plugin/js/quick-actions.js`; run `npm run gen-ribbon` only when modifying ribbon menus or registering additional actions. End users can edit existing action prompts entirely through the settings UI.

Release builds compile five installation assets (Windows EXE; Linux x64/ARM64 DEB and tar.gz), validate their contents, and publish checksums only if all build jobs succeed. CI does not replace manual end-to-end testing in every WPS desktop variant.

## ⚠️ Compatibility and support

- WPS desktop JSAPI is required; the mobile and web WPS apps are not supported.
- Some recent WPS builds may have JSAPI compatibility issues; see [known limitations (Chinese)](README.md#-已知限制).
- The included Linux runtime needs a compatible libc; uncommon/older Linux distributions may need special packaging.
- If an action's built-in behavior is a pure modal, its prompt cannot be overridden.
- Report issues with the OS, WPS version, host app, steps to reproduce, and logs in [GitHub Issues](https://github.com/lbg2002/WPS-AI/issues).

## 📄 License

Distributed under [MIT License](LICENSE). Preserve original copyright notices and license conditions. Screenshots, product branding and other assets may be subject to separate rights.
