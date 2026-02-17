# Plan: Fix intermittent LLM TypeError during evaluation

**Status:** Completed
**Date:** 2026-02-17

## Goal

Fix the intermittent `'Response' object is not subscriptable` TypeError that occurs during RAG evaluation when the Google Gemini streaming API returns a response chunk that `langchain-google-genai` cannot parse correctly.

## Summary of Changes

- Added `TypeError` retry logic in `stream_query()` — retries up to 2 times with exponential backoff before failing, matching the existing `ResourceExhausted` retry pattern
- Added `TypeError` retry logic in sync `query()` — retries once after a 2-second delay for the synchronous evaluation path
- Both handlers log retry attempts for observability (e.g., `LLM TypeError (attempt 1/2): ...`)

## Files Modified

- [backend/app/services/rag_service.py](backend/app/services/rag_service.py) - Added `TypeError` catch blocks with retry logic in both `stream_query()` and `query()` methods

## Breaking Changes

None

## Deprecations

None
