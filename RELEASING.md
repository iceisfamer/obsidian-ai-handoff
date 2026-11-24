# Release and submission runbook

Maintainer: cybrea. Repository: https://github.com/iceisfamer/obsidian-ai-handoff.

This runbook covers GitHub beta releases and the later Community directory submission. A GitHub release does not imply acceptance into the plugin directory.

## Prepare locally

1. Update `manifest.json`, `package.json`, and `versions.json` together; update the lockfile. Keep the manifest author `cybrea` and `isDesktopOnly: true`.
2. Use a numeric `x.y.z` version. For this beta use version/tag **0.3.0** and release title **AI Handoff 0.3.0 — macOS public beta**. Do not use `v0.3.0` or `0.3.0-beta.1` as the tag.
3. Run `npm ci --ignore-scripts` and `npm run release:prepare` with Node 24+ and Python 3.
4. Review `dist/0.3.0/`: runtime assets, install ZIP, clean source ZIP, release notes, and SHA-256 hashes. Packaging excludes local vaults, private histories, `.dev`, installation backups, credentials, and dependencies by an explicit allowlist.
5. Keep the completed local QA results and disclosed limitations in `VALIDATION.md`. Screenshots are optional; if added, use only a synthetic test vault.

## Publish the beta when authorized

1. Create a public GitHub repository owned by the intended maintainer. The repository name is `obsidian-ai-handoff`; author attribution stays **cybrea** regardless of the GitHub account name.
2. Extract the clean source ZIP into a fresh repository root. Do not upload the working directory wholesale. Confirm README, LICENSE, manifest, sources, tests, and workflow are included; commit and push the default branch.
3. Run CI, then create the **0.3.0** tag on the reviewed commit. Use a GitHub prerelease for this public testing phase, with the title above and the supplied RELEASE_NOTES.md body.
4. Attach **main.js**, **manifest.json**, and **styles.css** individually as release assets. Also attach the install ZIP and checksum file. An install ZIP alone is insufficient for Obsidian's installer.
5. Download the published assets and compare hashes with the local release. Verify a clean test-vault installation using the published files.
6. Gather tester feedback. When ready for directory submission, create a regular release matching the manifest version (or a new version after changes) and verify installer behavior. Do not assume the directory supports prereleases as its install target.

## Submit to the current Community directory

The official submission flow currently uses the Community website, not a pull request to a registry JSON file:

1. Sign in at https://community.obsidian.md with the maintainer's Obsidian account and link the owning GitHub account.
2. Add a plugin and provide the repository. The manifest at HEAD of the default branch must match the release assets/version.
3. Recheck that `ai-handoff` is unique at submission time. The local preparation check is not a name reservation.
4. Review the README/privacy disclosure, desktop/macOS restriction, license, description, and account/network/cost requirements.
5. Address automated review feedback by correcting the source and publishing an incremented release as required. Request publication only after review issues are resolved.

This preparation does not claim official approval. No automatic release publishing is included in CI; the workflow only validates and builds artifacts.

## Official references

- [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)
- [Submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)
- [Developer policies](https://docs.obsidian.md/community-directory/developer-policies)
- [Official ESLint checker](https://github.com/obsidianmd/eslint-plugin)
