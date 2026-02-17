# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-02-17

### Changed
- Migrated package manager from npm to pnpm for disk space savings via content-addressable global store
  - Updated all root scripts from `npm --prefix frontend` to `pnpm -C frontend`
  - Added `packageManager: "pnpm@10.21.0"` to root package.json
  - Replaced `package-lock.json` with `pnpm-lock.yaml`
- Updated CI/CD pipeline (`deploy-frontend.yml`) to use `pnpm/action-setup@v4` and pnpm caching
- Updated README setup instructions from npm to pnpm

### Fixed
- Added ESLint flat config (`eslint.config.mjs`) required by ESLint 10 / Next.js 16
- Downgraded ESLint from `^10` to `^9` to resolve plugin incompatibility with `eslint-plugin-react`

## [1.1.0] - 2026-02-17

### Changed
- HypotheticalQuestions strategy is now built on-demand when user selects it, instead of at startup prebuild
  - Saves LLM tokens on frequent server restarts (e.g., Hugging Face Spaces redeploys)
  - Existing lazy-loading via `ensure_collection_ready()` handles the deferred build transparently

## [1.0.1] - 2026-02-17

### Fixed
- Intermittent `'Response' object is not subscriptable` TypeError during evaluation caused by transient `langchain-google-genai` streaming response parsing failures
  - Added retry logic with exponential backoff in `stream_query()` (up to 2 retries)
  - Added single retry with delay in sync `query()` method

## [1.0.0]

### Added
- **Swagger Documentation Enhancement**: Industry-standard API documentation
  - Root (`/`) now redirects to Swagger UI (`/docs`) for immediate discoverability
  - Added field descriptions and examples to all Pydantic schemas
  - Added endpoint summaries visible in Swagger sidebar
  - Documented error responses (429 rate limit)
  - Hidden debug endpoints from production Swagger docs

### Changed
- Backend API documentation now follows OpenAPI best practices

## [0.1.0] - 2025-12-27

### Added
- **Dependabot Auto-Merge with Safe CI/CD**
  - Backend testing infrastructure with pytest
  - Type checking with pyright
  - Auto-merge workflow respects branch protection
- **Evaluation UI Improvements**
  - Category breakdown and strategy insights in evaluation summary
  - Category chips for evaluation questions
  - Toggle to hide/show DatasetSelector bar
  - Mouse scroll wheel support on DocumentChipsBar
- **Chat UI Enhancements**
  - Markdown styling in message bubbles
  - Re-rank radio group option
- **Security**
  - Fixed React Server Components CVE vulnerabilities

### Fixed
- 精度テスト button not collapsing settings panel after first use
- Progress display showing misleading 0/10 → 0/15 transition

### Changed
- Moved 精度テスト button inside the DatasetSelector bar
- Lifted up DocumentChipsBar for better visibility
- Updated callout styles

### Dependencies
- Bumped `@types/node` from 20.19.25 to 25.0.3
- Bumped `astral-sh/setup-uv` from 5 to 7
- Updated 14 frontend dependencies
