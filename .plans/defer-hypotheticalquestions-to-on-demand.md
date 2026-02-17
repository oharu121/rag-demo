# Plan: Defer HypotheticalQuestions to on-demand

**Status:** Completed
**Date:** 2026-02-17

## Goal

Skip HypotheticalQuestions generation during startup prebuild (`PREBUILD_COLLECTIONS=true`) and defer it to on-demand when the user actually selects that retrieval strategy. This saves significant LLM tokens since each server restart would otherwise regenerate questions via LLM API calls.

## Summary of Changes

- Modified `build_all_collections()` to skip `HYPOTHETICAL_QUESTIONS` for **all** datasets (previously only skipped for `optimized` dataset)
- The existing lazy-loading path via `ensure_collection_ready()` handles on-demand building when the user selects the strategy
- No frontend changes needed — the existing streaming loading state covers the delay naturally

## Files Modified

- [backend/app/services/vectorstore_service.py](backend/app/services/vectorstore_service.py) - Changed skip condition in `build_all_collections()` to exclude HypotheticalQuestions for all datasets, not just non-ORIGINAL

## Breaking Changes

None

## Deprecations

None
