# Playwright practice

A small app plus a Playwright and TypeScript suite. The comments in the code say **where** a piece sits and **why** it is written that way. Read those before changing anything.

## Run

```bash
npm install
npx playwright install chromium
npm test
```

UI only: `npm run test:ui`. API only: `npm run test:api`. Headed: `npm run test:headed`. Report after a failure: `npm run report`.

`npm start` runs the app at `http://127.0.0.1:3000`. Login `qa@example.com` / `secret`.

## How the repo is split

| Path | What it is |
|---|---|
| `app/` | The product under test. Specs talk to it only over HTTP and the browser. |
| `shared/` | The contract: base URL, routes, users, the `Item` type. |
| `framework/` | Fixtures, page objects, the API client. Reused. No assertions. |
| `tests/setup/` | One UI login. Writes `storageState`. |
| `tests/ui/` | Browser specs. |
| `tests/api/` | HTTP specs. No browser. |
| `playwright.config.ts` | Projects: setup, logged-in chromium, guest chromium, api. |

## What to say in an interview

Walk these files in this order.

1. `playwright.config.ts` — projects, `storageState`, retries only on CI, trace on the first retry, the app booted by `webServer`.
2. `tests/setup/auth.setup.ts` — save the session only after the heading is visible.
3. `framework/fixtures.ts` — one context per test, API login is separate from the form.
4. `framework/pages/items.page.ts` — role and label locators, assertions stay in the spec.
5. `tests/ui/items.spec.ts` — subscribe to the POST **before** Save, then reload.
6. `tests/api/items.idempotency.spec.ts` — two POSTs, idempotency key, blind PUT, stale version.
7. `tests/ui/playback.spec.ts` — manifest `200`, then `paused` and `readyState` on the element.

Break one status code in `app/server.ts` and name which spec should go red. That is the check that the assertion sits at the right layer.
