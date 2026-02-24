# PRDDelta: Job Logs Stabilization v1

**Feature:** Job Logs  
**Phase:** FRONTEND (stabilization)  
**Priority:** P0 — Stability  
**Author:** PM Agent  
**Date:** 2026-02-17

## Problem Statement
Job Logs has a working clock-in/out flow and photo upload, but lacks resilience. No error boundaries exist — a single crash (bad Firestore response, failed upload, network drop) takes down the entire page. Photo uploads have no retry, no size validation, and no progress feedback beyond a spinner. The orphaned `jobLogService.ts` duplicates logic already inline in `JobLogs.tsx`.

## Goals
1. **Upload Reliability** — Uploads should survive flaky connections, validate file size/type, show real progress, and retry on failure.
2. **Error Boundary Coverage** — React error boundaries around Job Logs and photo sections so a crash isolates to a recoverable UI, not a white screen.
3. **Dead Code Cleanup** — Remove or integrate `services/jobLogService.ts` (currently unused; `JobLogs.tsx` has its own inline Firebase calls).

## Non-Goals
- New features (notes field, GPS tagging, offline queue) — deferred.
- Firestore schema changes — none required.
- Auth flow changes — out of scope.

## Requirements

| ID | Requirement | Risk | Approval |
|----|-------------|------|----------|
| S1 | Add `<ErrorBoundary>` wrapping `/jobs` route with fallback UI + retry button | low | no |
| S2 | Add nested error boundary around photo upload section | low | no |
| S3 | Validate file before upload: max 10MB, image/* only, toast on rejection | low | no |
| S4 | Add upload retry (1 automatic retry on failure, then surface manual retry button) | low | no |
| S5 | Show upload progress bar (use `uploadBytesResumable` instead of `uploadBytes`) | low | no |
| S6 | Delete `services/jobLogService.ts` (dead code, all logic lives in `JobLogs.tsx`) | low | no |

## Success Criteria
- No unhandled crash reaches white screen on `/jobs`
- Photo upload of 5MB file succeeds with visible progress
- Upload of 15MB file is rejected with toast before hitting Firebase
- Network-interrupted upload auto-retries once, then shows retry button

## Stability Priority Rule
All items are stability/hardening. No new user-facing features introduced.
