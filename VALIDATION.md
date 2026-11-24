# Validation and beta limits

Date: 2026-11-24 · AI Handoff 0.3.0 · author: cybrea

## Automated checks on 0.3.0

- Official `eslint-plugin-obsidianmd` recommended configuration: passed without warnings or errors. The configuration covers plugin source, manifest, package metadata, and license. Node transport timeouts use explicit Node timers; UI timers use window timers.
- TypeScript type checking and esbuild production bundle: passed.
- **18 offline tests passed**: full untruncated note input, changed-note snapshots, same-session follow-up, quote/draft preservation, removable quotes, note/backend separation, stream deduplication, resumed session IDs, process failures, interruption, overlapping-send rejection, authentication errors, empty responses, malformed event fields, and sidebar DOM mounting.
- Dependency installation audit: **0 vulnerabilities** reported after overriding the development-only `eslint-plugin-n` dependency to 18.5.0. The override removes an affected minimatch dependency from the official checker's transitive tooling. No development dependency is bundled into the runtime plugin.
- Dependency versions are locked. Development uses TypeScript 6.x for compatibility with the official checker; Node.js 24+ is required for the test runner.

## Real client testing

Only a synthetic article about seven trees, two newly added trees, and an invented project name is used. No personal vault articles are sent during release testing.

- Codex: full-note answer, quoted-passage critique, continuous follow-up, and same-session restoration all passed again against the 0.3.0 backend.
- Antigravity/Gemini: full-note answer, quoted-passage critique, continuous follow-up, and same-session restoration all passed again against the 0.3.0 backend.
- Tested client versions: bundled Codex CLI 0.171.0-alpha.13.2; Antigravity CLI 1.5.16. These are tested versions, not a promise of compatibility with every earlier or later CLI.
- Model access and service availability depend on the account. Automated fixture tests do not prove upstream service availability.

## Native UI testing and limits

The preceding 0.2.0 build was tested in Obsidian 1.15.1 on an Apple Silicon Mac using an isolated synthetic vault: sidebar opening, full-note responses, editor and reading-view selection, draft preservation, quote removal, three-turn conversations with both providers, per-note history, reopening, and an unobstructed Send button passed.

The 0.3.0 native settings page was retested in Obsidian 1.15.1 using the official CLI and the actual settings window, not a mocked DOM. All four fields accepted real text insertion, persisted to disk, and restored after plugin reload. Native settings search found both Gemini fields. Original empty defaults were restored and verified after another reload. The page was visually inspected in the default dark and light themes; all fields and disclosure text were readable without overlap. Screenshots were captured from the separate native settings window. No application errors were captured during the run.

The 0.3.0 backend and sidebar DOM checks also passed as described above. Detached-note selection remains outside this native acceptance pass.
Windows, Linux, mobile, Intel Macs, detached-window behavior, and third-party themes have not received native acceptance testing. The macOS beta is not a claim of full cross-platform support.

## Distribution checks

- The public Obsidian plugin index was checked on 2026-11-24: no matching `ai-handoff` ID or exact `AI Handoff` name was found among 10,816 entries. Recheck before submission; this does not reserve the name.
- The install package includes only runtime files and public documentation. The source package uses an explicit file allowlist and preserves executable fixture permissions.
- Private vaults, `.dev`, installation backups, saved chats, authorization codes, machine-specific paths, and node_modules are excluded.
- The source ZIP was extracted into an isolated temporary directory, installed from the locked dependency cache, and passed the full release pipeline. Rebuilt runtime assets and ZIPs had identical SHA-256 hashes.
- Release hashes are in `SHA256SUMS.txt`. The separate `main.js`, `manifest.json`, and `styles.css` assets are prepared for GitHub Release.
- GitHub CI runs the portable lint, typecheck, mock-client/DOM tests, and build on Ubuntu with Node.js 24; native macOS acceptance is performed separately. The macOS beta release and its assets are published separately from Community directory acceptance; repository and release status can be verified on GitHub. A directory listing is not implied by this validation report.

## Manual acceptance before promotion

1. In a disposable vault, install the candidate ZIP and enable AI Handoff.
2. Settings acceptance: completed on 0.3.0 (four fields, persistence, reload, search, default light/dark themes). Repeat after any settings changes.
3. Test full-note, selection quote, follow-up, stop, and reopening with both available providers.
4. Test changed-note snapshots and per-note isolation. Verify a removed quote stays removed after focusing the composer.
5. Check the sidebar in light/dark themes and a detached note window; report Intel results separately.
6. Install the published release assets into a fresh test vault and compare checksums before directory submission.
