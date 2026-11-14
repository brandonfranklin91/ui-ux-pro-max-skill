# Boselli Wrap Works — wrap visualizer

*Your ride. Your signature.*

A mobile-first car customization visualizer: preview wraps, finishes, wheel styles and window tint on a live 3D coupe or your own photo, save builds, and request an installation quote. Includes a staff dashboard for the shop.

## Run it

Requires **Node 22.13+** (uses the built-in `node:sqlite`). No build step.

```bash
cd projects/boselli-wrap-works
npm install      # only dependency: three
npm start        # http://localhost:4173
npm test         # end-to-end workflow + privacy checks (needs Playwright + Chromium)
```

Data lives in `data/` (SQLite database + private uploads; git-ignored). Delete the folder to reset.

| Env var | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `4173` |
| `BWW_DATA_DIR` | Database + uploads folder | `./data` |
| `NODE_ENV=production` | Adds `Secure` to the session cookie (serve over HTTPS) | off |
| `BWW_STAFF_PASSWORD` / `APEX_STAFF_PASSWORD` | Passwords for the seeded staff accounts (first run only) | see below |

### Demo accounts (seeded on first run — change before going live)

| Role | Email | Password |
|---|---|---|
| Boselli shop staff | `staff@boselliwrapworks.test` | `boselli-demo` |
| Second tenant, used to prove isolation | `staff@apexwraps.test` | `apex-demo` |

Customers create their own accounts in the app. Staff sign in from **Account**; the **Shop dashboard** link then appears. A second shop's storefront is reachable with `/?shop=apex`.

### Static showcase (no server)

`node scripts/build-static.mjs` writes `dist-static/`: the landing, install film, 3D editor and photo demo as plain files that can be hosted anywhere. Accounts, saving, My Garage, quotes and the shop dashboard are switched off there and the page says so.

## What's in the app

- **Studio** – scroll-driven landing (3D coupe that turns with scroll, then a 150-frame scroll-scrubbed install film), then the editor: wrap color (search, favorites, custom), finish, design (full / contrasting roof / hood accent / racing stripes), wheels (4 styles × 4 finishes), tint, undo/redo/reset, before-and-after slider, image download. Bottom drawer on mobile, side panel on desktop.
- **My Garage** – named builds with vehicle details, reopen with selections restored, compare two builds, opt-in share links, delete.
- **My Quotes** – request number, status (Submitted → Under review → Quote ready → Accepted), shop replies, accept/decline.
- **Account** – profile, preferences, password, free-preview usage.
- **Shop dashboard** (staff only) – respond to requests, manage colors/finishes/services, pricing rules, turnaround, free-preview allowance, plan and usage.

## What is real and what is demo

| Area | Status |
|---|---|
| 3D demo coupe | **Real.** Original procedural model (`public/js/car3d.js`, no third-party licence). Paint, design zones, glass and wheel assets are actual material/geometry changes; rotate and zoom work. |
| Accounts, builds, uploads, quotes, shop dashboard | **Real**, persisted in SQLite. Passwords are scrypt-hashed; sessions are HttpOnly cookies. |
| Photo previews | **Demo processing, labelled in the UI.** No AI segmentation service is connected, so the customer taps panels (color-similarity select) and refines with a brush; the wrap color is blended over the photo's own shading so shadows and reflections remain. Runs in the browser; the original upload is stored untouched. Photos stay 2D (no 360°). |
| Prepared sample photo | **Demo.** A studio render of the coupe with pixel-accurate prepared masks for body, windows and wheels. |
| Wheel *style* swap on photos | **Not available** without an image-generation service; the UI says so. Wheel *finish* can be previewed on the marked wheel area. |
| Prices | Shown only when staff enter one, or when the shop turns on **automatic estimates** (service base price × finish × size multipliers), and then labelled as an estimate. |
| Subscription billing | **Test mode.** "Start test subscription" flips plan state in the database; no card is charged. Kept separate from customer install quotes. |

## Integrations awaiting credentials

| Integration | Env var | What to wire | Where |
|---|---|---|---|
| AI panel segmentation / image editing (e.g. SAM-class segmentation plus an inpainting model for wheel swaps) | `SEGMENTATION_API_KEY` | Add a server route that sends the stored upload to the provider and returns body/glass/wheel masks; feed them to `photo.load(image, masks)` in place of manual selection | `server.js` (`INTEGRATIONS`), `public/js/studio.js` (`initStage`) |
| Stripe subscriptions for the shop plan | `STRIPE_SECRET_KEY` (+ webhook secret) | Replace the test branch of `POST /api/shop/billing` with Checkout + webhooks that set `plan_status` | `server.js` |
| Email notifications for new requests and shop replies | `SMTP_URL` | Send on `POST /api/quotes` and `PATCH /api/shop/quotes/:id` | `server.js` |

None of these are implemented yet; the flags only tell the UI what to label as demo.

## Business model (proposed, configurable)

- **Customers:** free. Each gets a configurable allowance of photo previews (default 5, set under Shop → Pricing). The 3D demo is unlimited because it costs nothing to run.
- **Shops:** `Shop Pro` at **$79/month** — 400 photo previews included, $0.15 per extra preview to cover image-generation cost, 5 staff seats. Constants are in `PLAN` in `server.js`; usage is metered per shop.

## Privacy and tenancy

- Uploads are stored outside the web root and served only to their owner, or to staff of a shop that received a quote for a build using that upload.
- Builds and quotes are always queried by owner; unknown or foreign IDs return 404.
- Every staff query is scoped to the staff member's `shop_id`, so shops never see each other's customers or requests.
- Share links are created only on request, expose just the preview image and selections, and can be switched off.

`npm test` verifies the whole flow (open studio → customize → compare → save → reopen → request quote → see it in the right shop dashboard) and 19 access-control cases.

## Before production

Serve over HTTPS with `NODE_ENV=production`, replace the seeded staff passwords, add password reset and email verification (needs the email integration), put rate limiting at the proxy, and back up `data/`.

## Assets

Logo, app icon and the install film frames in `public/assets/` were supplied by Boselli Wrap Works. Fonts (Saira, Manrope) load from Google Fonts.
