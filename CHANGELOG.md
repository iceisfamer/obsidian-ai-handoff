# Changelog

## 0.3.0 — macOS public beta — 2026-11-24

- Package the full-note sidebar discussion workflow for public testing on macOS.
- Keep full-note context, automatic removable selection quotes, streaming output, per-note/backend history, and follow-up conversations from 0.2.0.
- Validate untrusted client event fields; reject empty or incomplete Codex replies instead of reporting success.
- Register selection listeners on each note's owning document, including detached windows.
- Use searchable Obsidian setting definitions and handle save errors on unload.
- Add an unsupported-platform notice, MIT license, English/Chinese installation guides, privacy disclosures, offline CI, and allowlisted release packaging.
- Raise the declared minimum Obsidian version to the tested 1.15.1. Conversation data format remains version 2.

## 0.2.0 — local test release

- Native sidebar discussions with Codex and Gemini through Antigravity CLI.
- Full article context, selected-text quotes, continuous follow-up, streaming, stop, and conversation restoration.
- Separate conversations by note and provider; preserve drafts when selecting text.

## 0.1.0 — local prototype

- Initial manual handoff prototype, superseded by the native sidebar workflow.
