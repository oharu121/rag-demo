# Plan: Migrate from npm to pnpm

**Status:** Completed
**Date:** 2026-02-17

## Goal

Switch the project's package manager from npm to pnpm to leverage pnpm's content-addressable global store, which deduplicates shared packages across 19 repos on the same drive — potentially saving 10-20 GB of disk space.

## Summary of Changes

- Replaced all `npm` / `npm --prefix frontend` script references with `pnpm` / `pnpm -C frontend` equivalents in root package.json
- Added `packageManager: "pnpm@10.21.0"` field to root package.json
- Updated CI/CD workflow to use `pnpm/action-setup@v4`, pnpm caching, and `pnpm install --frozen-lockfile`
- Deleted `package-lock.json` files and generated `pnpm-lock.yaml` files
- Added ESLint flat config (`eslint.config.mjs`) required by ESLint 10 / Next.js 16
- Downgraded ESLint from `^10` to `^9` to fix plugin compatibility (`eslint-plugin-react` et al. don't yet support ESLint 10)
- Updated README.md setup instructions from npm to pnpm

## Files Modified

- [package.json](package.json) - Added `packageManager` field, updated all scripts from npm to pnpm
- [frontend/package.json](frontend/package.json) - Downgraded eslint from `^10` to `^9`
- [frontend/eslint.config.mjs](frontend/eslint.config.mjs) - New file: ESLint flat config for Next.js
- [.github/workflows/deploy-frontend.yml](.github/workflows/deploy-frontend.yml) - Added pnpm/action-setup, updated cache/install/run commands
- [README.md](README.md) - Updated npm commands to pnpm
- [pnpm-lock.yaml](pnpm-lock.yaml) - New file: root lock file
- [frontend/pnpm-lock.yaml](frontend/pnpm-lock.yaml) - New file: frontend lock file
- `package-lock.json` - Deleted
- `frontend/package-lock.json` - Deleted

## Breaking Changes

None

## Deprecations

None
