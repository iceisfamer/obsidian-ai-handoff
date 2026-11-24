# Privacy and data handling

AI Handoff 0.3.0 · 2026-11-24 · Maintainer: cybrea

## Data flow

Opening the sidebar or selecting text does not submit a model request. Pressing Send starts the selected local CLI and supplies the user's question. The first turn, and any turn after a note changes, includes its title, vault-relative path, and complete current Markdown. A selected quote is included when present. Follow-up turns reuse the CLI conversation, so earlier note content remains available to the service even after the local note changes.

The local CLI connects to its configured service. Default integrations are Codex/OpenAI and Antigravity/Google; a user's CLI settings or environment may configure other models, providers, billing, or endpoints. The plugin does not route these requests through a maintainer-operated server. It does not scan the vault for model context or automatically expand linked notes or attachments.

The UI uses Obsidian's Markdown renderer for completed assistant answers. Its normal handling of embedded images or other resources may request those resources from their hosts. This is separate from model input.

## Local storage and access outside the vault

- `<vault>/.obsidian/plugins/ai-handoff/data.json` holds settings, conversation IDs, chat messages, quotes, and unsent drafts. It may contain personal note excerpts. A custom Obsidian config folder changes this path.
- `<plugin directory>/runtime/` is the working directory for client subprocesses.
- The plugin checks executable paths outside the vault to find an installed client and launches that client under the current user's account. It passes the inherited process environment and does not use a shell to interpolate note content into a command.
- The CLI reads its own account credentials/configuration and maintains its own history outside the vault (for example, Codex and Antigravity user configuration directories). This is needed to reuse the user's existing login and conversation sessions. The plugin does not itself copy login tokens or authorization codes into its settings.
- Vault sync, operating-system backup, or other installed plugins may have access to these local files. Removing a note does not automatically delete its stored conversation or its provider-side history.

## Controls and boundaries

The plugin has no analytics SDK, client-side telemetry, ads, or author-operated backend. It does not install or update itself or the external clients. Those clients have their own lifecycle and data settings.

The discussion integration restricts tool use: Codex is started with read-only sandbox settings and disabled tool-related features; server permission requests are rejected. Antigravity receives deny rules for commands, file operations, URLs, and MCP tools. These restrictions are enforced by the installed clients and are not a separate OS sandbox. User-installed CLI hooks, plugins, extensions, and custom configuration can affect behavior; review those settings before using confidential material. Never interpret a locally installed AI client as a guarantee of offline processing.

No automatic model request is made just by installing or enabling the plugin. Sending consumes the selected account's model allowance and can incur charges under the user's existing client/provider configuration. The plugin does not change provider billing settings.

## External service policies

External clients and services may retain conversation content and collect usage/diagnostic data according to their account settings and policies. The plugin cannot promise a provider's retention period or training treatment.

- [OpenAI privacy policy](https://openai.com/policies/privacy-policy/)
- [Google privacy policy](https://policies.google.com/privacy)
- [Antigravity settings and telemetry controls](https://antigravity.google/docs/settings?tab=cli)

If a different provider is configured in your CLI, review that provider's terms as well.

## Remove local data

Stop any active response and disable AI Handoff. To remove plugin chat data and settings, back up anything you need and delete its `data.json`. Removing the entire `ai-handoff` directory also removes its local runtime folder. Re-enabling creates fresh plugin data. Use the respective client's and service's controls to delete their separate sessions or account history. Synced copies and backups may need separate removal.

## Reporting a problem

Use the [repository issue tracker](https://github.com/iceisfamer/obsidian-ai-handoff/issues) for non-sensitive bug reports. Share synthetic reproduction notes and redacted error text. Do not post `data.json`, full CLI logs, access tokens, authorization codes, or private notes in public issues.
