# AI Handoff

Discuss the note you are reading in a right-hand sidebar, using your locally installed Codex or Antigravity CLI. Full-note context, selected-text quotes, streaming replies, and follow-up questions stay together in Obsidian.

**0.3.0 · macOS public beta · Chinese interface · by cybrea**

[Download the macOS beta](https://github.com/iceisfamer/obsidian-ai-handoff/releases/tag/0.3.0) · [Report an issue](https://github.com/iceisfamer/obsidian-ai-handoff/issues) · [中文说明](README.zh-CN.md) · [Privacy](PRIVACY.md) · [Test coverage](VALIDATION.md) · [Changes](CHANGELOG.md)

## Requirements and costs

- macOS with Obsidian **1.15.1 or later**. This beta has been tested on Apple Silicon only; Intel Macs are unverified. Windows, Linux, iOS, and Android are outside this release's supported scope.
- Install and sign in to **at least one** supported backend yourself: Codex with `app-server`, or [Antigravity CLI](https://antigravity.google/docs/getting-started?tab=cli) (`agy`) for the Gemini option. Run the chosen client directly once and verify it can answer a question. Signing in to a browser chat application does not necessarily sign in to its CLI.
- Internet access and an account with access to the selected model are required. The plugin is free under MIT; model providers may require a paid plan or charge against your existing usage quotas or API configuration. The plugin does not provide credits or bypass account restrictions.
- The plugin starts an installed executable; it does not embed the desktop chat window, bundle a model, or install/update clients. The Gemini option uses Antigravity CLI, **not the legacy `gemini` executable**. Its model is inherited from the CLI unless overridden; select a Gemini model explicitly if that CLI defaults to another provider.

## Install or upgrade

This beta is distributed as a manual installation package; it is not yet listed in the Community Plugins directory.

1. Quit Obsidian, or disable an existing AI Handoff installation.
2. Extract the release ZIP. Copy its `ai-handoff` folder into `<vault>/.obsidian/plugins/`. If you use a custom configuration folder, substitute that folder for `.obsidian`.
3. Check that `main.js`, `manifest.json`, and `styles.css` are directly inside `.obsidian/plugins/ai-handoff/` (without an extra nested folder).
4. Reopen Obsidian and enable **AI Handoff** under Settings → Community plugins. Enable community plugins if required.
5. Under Settings → AI Handoff, leave paths blank for automatic detection, or provide the full executable path. Model names are optional and must be supported by your account.

For an upgrade, back up the plugin directory first, then replace the three runtime files above. Preserve your own `data.json` and `runtime/`. No other vault settings need to change. To roll back, disable the plugin and restore the backup. Version 0.3.0 preserves the 0.2.0 conversation data format.

## Use

1. Open a Markdown note and click the **问 AI · 当前文章** ribbon icon, or run **AI Handoff: 打开文章对话**.
2. Choose **Codex** or **Gemini** in the sidebar. Ask a question; the first turn supplies the complete current note.
3. Select text in the editor or reading view. A removable quote card appears above the composer without replacing your question draft. Selection alone does not send anything.
4. Send with **Enter**; insert a new line with **Shift+Enter**. Continue asking questions in the same conversation. Use **停止** to stop generation.
5. Each note and backend has its own conversation. The history button starts a new conversation or restores an archived one.

## Context and privacy

**Sending a question sends the note's complete Markdown, title, vault-relative path, selected quote, and question to the selected CLI and its configured AI service.** The CLI connects to OpenAI, Google, or a provider configured in that client. No request goes through a server operated by this plugin's author.

When the note changes, the next turn supplies the updated full text; unchanged notes reuse their existing conversation. The plugin does not silently truncate long notes, but provider context limits still apply. It does not expand attachments, images, PDFs, or linked notes into model input. Embedded content in AI replies is rendered by Obsidian's Markdown renderer, which may load linked resources.

Conversation text, quotes, drafts, backend conversation IDs, and settings are stored in the plugin's `data.json`. Local CLIs maintain separate account/configuration/history files outside the vault. Vault sync or backups may include plugin conversations. The plugin has no telemetry or author-operated backend; external clients and services have their own data policies. Read [PRIVACY.md](PRIVACY.md) before using personal or confidential notes.

The plugin offers reading and discussion, without a note-editing action. Codex runs with read-only sandbox settings and restricted features; Antigravity receives per-session tool-deny rules. These are client-level restrictions, not a separate operating-system security boundary. Existing CLI hooks, extensions, custom providers, and account settings remain under the user's control.

## Known limits and troubleshooting

- Current interface and discussion instructions are in Chinese. General multilingual support is not part of this beta.
- Only one answer can run at a time. Switch back to the originating note to see its answer.
- No client found: install and log in to a compatible client, then provide its full executable path. Codex detection prefers the desktop app's bundled CLI; very old versions may not support the configured model.
- Authentication or quota error: verify a direct CLI conversation first; refresh login or resolve provider quota limits there.
- A lost or deleted CLI session can prevent continuation even when the sidebar history remains. Start a new conversation from the history button.
- New upstream client releases can change their protocols. The exact versions tested are listed in [VALIDATION.md](VALIDATION.md).
- Detached-window selection handling is implemented, but this beta's real UI acceptance testing covered the main Obsidian window only. Intel Macs and third-party themes need tester feedback.

## Development

Use Node.js 24+ and Python 3 for packaging. The TypeScript compiler is pinned to the 6.x family because the official Obsidian ESLint checker currently needs the JavaScript TypeScript API. A development-only override upgrades `eslint-plugin-n` to 18.5.0 to remove a vulnerable transitive glob matcher; the full recommended checker still runs.

```sh
npm ci --ignore-scripts
npm run check
npm run release:prepare
```

`check` runs the official Obsidian ESLint recommended rules, type checking, offline fixture tests, and the build. Tests use synthetic text and mock clients; they do not send vault data to AI services. `release:prepare` additionally creates release assets and an allowlisted source ZIP in `dist/0.3.0/`. See [RELEASING.md](RELEASING.md) for the manual publication process.

Obsidian and CodeMirror remain runtime externals supplied by Obsidian. Development dependencies retain their own licenses and are not included in the install ZIP. This is an independent plugin, not affiliated with or endorsed by Obsidian, OpenAI, or Google.

## License

[MIT](LICENSE). Copyright 2026 cybrea.
