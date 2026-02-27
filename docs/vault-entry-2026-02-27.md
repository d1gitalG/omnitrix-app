# Vault Entry — 2026-02-27 (OFA) Learnings

## 1) Snapshot vs Optimistic UI
**Problem:** Upload UI showed duplicate photo counts.
**Cause:** UI appended `jobPhotos` locally *and* Firestore `onSnapshot` updated the same list.
**Fix Pattern:** For real-time docs, use `onSnapshot` as the source of truth; avoid double-appends.

## 2) Smoke Test Robustness
- Avoid matching toast text (transient) for state assertions.
- Prefer status-card selectors / deterministic DOM anchors.
- For actions that rely on server sync, include retries and adequate timeouts.
- Make optional tests opt-in (admin login) to reduce flake.

## 3) Form State Carry-Over
**Problem:** New job inherited prior job details.
**Cause:** Form state wasn’t cleared when active job ended.
**Fix Pattern:** Reset fields when `activeJobId` becomes null / snapshot empty.

## 4) GitHub Ops
- SSH remote enables non-interactive `git push`.
- `gh` CLI can create PRs + squash merge with auto-merge:
  - `gh pr create ...`
  - `gh pr merge <n> --squash --auto --delete-branch`
