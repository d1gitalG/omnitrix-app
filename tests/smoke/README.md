# OFA Smoke Tests (Puppeteer)

These are quick, repeatable browser checks for the Omnitrix Field App.

## Setup

### 1) Set environment variables

You can set these either via your shell, **or** (recommended) by putting them in `omnitrix-app/.env.local`.

Required (non-admin test user):
- `OFA_TEST_EMAIL`
- `OFA_TEST_PASSWORD`

Optional (admin gate test):
- `OFA_ADMIN_EMAIL` (should be `gianni@omnitrix.tech`)
- `OFA_ADMIN_PASSWORD`

Target URL (optional):
- `OFA_URL` (default: `https://omnitrix-app.vercel.app`)
  - For local dev: `http://localhost:5173` (make sure `npm run dev` is running)

#### Using `.env.local` (recommended)

1) Copy the example file:

```powershell
Copy-Item .env.local.example .env.local
```

2) Edit `.env.local` and fill in the `OFA_*` values.

> `/.env.local` is gitignored so secrets stay local.

### 2) Run

From `omnitrix-app/`:

```powershell
node tests/smoke/run-all.js
```

Run a single test:

```powershell
node tests/smoke/run-all.js --only jobs
node tests/smoke/run-all.js --only upload
node tests/smoke/run-all.js --only admin
```

## What it checks
- Login works
- Job Logs page renders + Job Type selector appears when clocked out
- Clock In/Out works + Recent Activity renders the chosen job type
- Photo upload flow works (uploads a 1x1 PNG)
- Admin route gating (optional if admin creds provided)
