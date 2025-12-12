# Development Guide

This document outlines the development workflows and rules for the **Ctrl+Enter Sender** project.

## 🚀 Release Workflow

We use `pnpm version` to manage versioning, which automates updating `package.json`, `manifest.json`, and creating Git tags.

**To release a new version, run one of the following commands:**

- **Patch Release** (Bug fixes, small tweaks): `1.0.2` -> `1.0.3`
  ```bash
  pnpm version patch
  ```

- **Minor Release** (New features, non-breaking changes): `1.0.2` -> `1.1.0`
  ```bash
  pnpm version minor
  ```

- **Major Release** (Breaking changes): `1.0.2` -> `2.0.0`
  ```bash
  pnpm version major
  ```

### What happens automatically?

When you run `pnpm version <type>`, the following steps are executed automatically:

1.  **Update `package.json`**: Increments the version number.
2.  **Run `scripts/update-manifest-version.js`**: Copies the new version from `package.json` to `manifest.json`.
3.  **Git Add**: Stages `manifest.json` so it's included in the release commit.
4.  **Git Commit**: Creates a commit with the message `vX.Y.Z`.
5.  **Git Tag**: Creates a tag `vX.Y.Z`.

### After Releasing

After running the command, simply push the changes and tags to GitHub:

```bash
git push && git push --tags
```

## 🛠️ Project Structure

- `src/content`: Content scripts (run on web pages).
  - `handler.ts`: Core logic for handling key events.
  - `detector.ts`: Logic for detecting editable elements.
  - `index.ts`: Entry point, event listener attachment.
- `src/background`: Background service worker.
- `src/popup`: Extension popup UI (React).
- `src/options`: Extension options page (React).
- `scripts`: Build and maintenance scripts.

## 📦 Build Commands

- `pnpm run dev`: Start dev server (HMR support).
- `pnpm run build`: Build for production.
