# Cymor Sell

**Your business. Your products. Your 24/7 sales agent.**

Cymor Sell is a multi-tenant Telegram commerce platform. A business owner
creates an account, configures their shop, adds products, and connects a
dedicated Telegram bot. Customers order directly through that bot — browsing,
cart, checkout, manual M-Pesa/bank payment confirmation, and PDF
invoices/receipts — while the owner manages everything from a web dashboard.

One backend serves every business bot; tenant data is isolated by `businessId`
throughout.

---

## What is Cymor Sell?

- **Business owners** get a setup wizard, product catalog (manual + CSV
  import), delivery zones, payment instructions, invoice branding, and a
  configurable sales-agent bot.
- **Customers** talk to the business's own Telegram bot — no Cymor Sell
  account needed.
- **Admin** gets aggregate platform analytics, broadcast messaging, and
  maintenance mode — never a window into individual businesses' private data.
- **AI (Gemini)** only answers genuinely open-ended questions, grounded in
  that business's real data. Ordinary browsing/pricing/delivery questions are
  answered deterministically from the database, and normal commerce keeps
  working even if Gemini is down or unconfigured.

## Features

- Multi-tenant architecture: one Express backend, many Telegram bots
- JWT auth (HTTP-only cookies), tenant-isolation middleware on every route
- Server-side-authoritative cart & order totals — client prices are never trusted
- CSV product import with row-level validation (preview → commit)
- Cloudinary image hosting for logos and products
- PDFKit-generated, branded invoices (PENDING) and receipts (PAID)
- Manual payment flow: customer taps "I've Paid" → `PAYMENT_VERIFICATION` →
  only the business owner can move it to `PAID`
- Telegram commerce engine: browsing, product detail, cart, delivery/pickup,
  checkout review, order creation — plus selective Gemini fallback for
  natural-language questions
- Admin: aggregate analytics, rate-limited broadcast, global maintenance mode,
  activity logs
- Rate limiting on auth, CSV import, AI calls, broadcasts, and webhooks
- Security: bcrypt password hashing, Helmet, Mongo query sanitization, CORS,
  file-type/size validation, tenant-ownership checks on every business route

## Architecture

```
Telegram (many business bots) ──┐
                                 ├──► ONE Express/Mongoose backend ──► MongoDB Atlas
Telegram (@CymorSellBot) ───────┘         │
                                           ├──► Cloudinary (images, PDFs)
Owner dashboard (Vercel, static) ─────────┤
Admin panel (Vercel, static) ─────────────┤
                                           └──► Gemini (selective AI only)
```

Each business's Telegram bot webhook points at
`{BACKEND_URL}/api/telegram/webhook/business/:botId` — `:botId` is our
internal Mongo id, **never** the bot token. Tokens are stored with
`select: false` and are never returned to any frontend.

---

## Local development (mobile-only workflow friendly)

This project assumes no local terminal/PC — everything can be edited via
GitHub's web UI and deployed straight to Render/Vercel. If you *do* have a
terminal:

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in real values
npm run dev
```

Backend runs on `http://localhost:5000` (or `PORT` from `.env`).

### Seeding demo data

Two options:
- `npm run seed` (from `backend/`)
- Or, once the server is running and `NODE_ENV` isn't `production`, visit
  `GET /api/dev/seed` in a browser — this exists specifically for
  mobile-only workflows with no local terminal.

Demo login after seeding: `demo@cymorsell.test` / `DemoPass123!`

### Frontend

Plain HTML/CSS/JS, no build step or bundler.

```bash
cd frontend
npx serve .
```

Edit `frontend/env-config.js` (served at `/env-config.js`) to point
`window.CYMOR_ENV.API_URL` at your backend.

---

## MongoDB Atlas setup

1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user and note the password
3. Add your IP (or `0.0.0.0/0` for early development) to Network Access
4. Copy the connection string into `MONGODB_URI` in `.env`

## Telegram setup

### Main management bot (`@CymorSellBot`, one for the whole platform)

1. Message **@BotFather** on Telegram → `/newbot`
2. Copy the token into `TELEGRAM_MAIN_BOT_TOKEN`
3. The backend sets this bot's webhook automatically on boot

### Per-business bots

Telegram's Bot API does not support creating bots programmatically — each
business owner must create their own bot via BotFather themselves, then paste
the token into the dashboard's "Telegram Bot" page. Cymor Sell validates the
token, stores it securely, and sets the webhook for you.

### Admin identification

`ADMIN_TELEGRAM_ID` should be the administrator's **numeric** Telegram user
ID (get it from a bot like @userinfobot) — never a username, since usernames
can change. The web admin panel additionally requires `ADMIN_EMAIL` +
`ADMIN_PASSWORD_HASH` (a bcrypt hash — generate one with
`node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"`).

## Cloudinary setup

1. Create a free account at https://cloudinary.com
2. Copy Cloud Name, API Key, and API Secret from the dashboard into `.env`

## Gemini setup

1. Get a free API key at https://aistudio.google.com/app/apikey
2. Set `GEMINI_API_KEY` in `.env`. If left blank, the bot still works fully —
   AI-dependent answers just fall back to "AI is temporarily unavailable,
   here's the menu."

---

## Environment variables

See `backend/.env.example` for the full list with comments. Never commit a
real `.env` file — only `.env.example` (with placeholders) belongs in git.

---

## Deployment

### Backend → Render

1. Push this repo to GitHub
2. New Web Service on Render → connect the repo
3. **Root directory:** `backend`
4. **Build command:** `npm install`
5. **Start command:** `npm start`
6. Add all variables from `.env.example` under Render's Environment tab
7. Set `BACKEND_URL` to the Render URL Render gives you once deployed (needed
   so Telegram webhooks point at the right place)

A `render.yaml` blueprint is included if you prefer Render's Blueprints flow.

### Frontend → Vercel

1. New Project on Vercel → connect the repo
2. **Root directory:** `frontend`
3. **Build command:** none (static site, no build step)
4. **Output directory:** `.` (project root)
5. Before/after deploying, edit `frontend/env-config.js` to set
   `API_URL` to your live Render backend URL, and set `FRONTEND_URL` in the
   backend's env to your live Vercel URL

### MongoDB Atlas

Already covered above — just make sure Atlas's Network Access allows
connections from Render (either your Render service's static IP, if you're on
a paid tier, or `0.0.0.0/0` for simplicity on free tiers).

---

## Production considerations

- The MVP uses **manual** payment confirmation — no STK Push. A customer's
  "I've Paid" tap only moves the order to `PAYMENT_VERIFICATION`; only the
  business owner confirming from the dashboard can mark it `PAID` and issue a
  receipt.
- CSV import preview state and Telegram bot conversation state (`Session`
  model) are designed for a single backend instance. For horizontal scaling,
  move the CSV preview cache out of memory (e.g. into Mongo with a TTL index)
  — the `Session` model already lives in Mongo so it survives restarts/redeploys.
  Broadcasts are sent inline with light pacing; for platform scale, move this
  to a proper queue/worker.
- AI request counting for the admin dashboard is in-memory per process; for
  multi-instance deployments, persist it (e.g. an atomic counter field on
  `SystemSettings`) instead.
- Telegram webhook signature validation: Telegram doesn't sign webhook
  payloads by default. For extra hardening, set a `secret_token` on
  `setWebhook` and verify the `X-Telegram-Bot-Api-Secret-Token` header — not
  wired in by default here to keep the MVP simple, but straightforward to add
  in `telegram/telegramClient.js` and `telegramController.js`.

## Security notes

- Passwords hashed with bcrypt; sessions are JWTs in HTTP-only cookies
- Every tenant-scoped route requires `requireAuth` + `requireBusiness`, and
  all queries are scoped by `req.businessId` — cross-business access returns
  403/404, never another tenant's data
- Bot tokens: `select: false` in Mongoose, never serialized to any API
  response, never appear in any frontend code or URL
- Admin identity is resolved server-side only (env-configured email or
  Telegram numeric ID) — never inferred from a Telegram username
- File uploads are validated by MIME type and size before ever reaching
  Cloudinary; nothing is written to local disk
- All monetary totals are recomputed server-side on every cart/order
  operation

## Testing

`backend/src/tests/` contains `node:test` suites. Run with:

```bash
cd backend
npm test
```

`csvImportService` tests run standalone with no database. Full integration
tests (auth, tenant isolation, cart calculation against live data, payment
confirmation, admin authorization) need a real MongoDB connection — point
`MONGODB_URI` at a disposable test database and extend the suite following
the same pattern. See `backend/src/tests/README.md`.

## Seed data

`backend/src/scripts/seed.js` creates a demo business ("Best Shoes Kenya")
with sample products, delivery zones, and payment settings. It is **never**
run automatically — only via `npm run seed` or the dev-only `/api/dev/seed`
endpoint (disabled when `NODE_ENV=production`).

## Project structure

```
cymor-sell/
├── frontend/            # Static HTML/CSS/JS dashboard (Vercel)
│   ├── index.html        # Landing + login/register
│   ├── dashboard.html    # Owner dashboard (setup wizard + all sections)
│   ├── admin.html        # Admin panel
│   ├── env-config.js     # Runtime API_URL config (served at /env-config.js)
│   └── src/{css,js}
├── backend/              # Express/Mongoose API (Render)
│   └── src/
│       ├── config/       # env, db, cloudinary
│       ├── models/       # Mongoose schemas
│       ├── middleware/   # auth, tenant isolation, uploads, rate limits
│       ├── controllers/  # route handlers
│       ├── routes/
│       ├── services/     # cart calc, order logic, csv import, activity log
│       ├── telegram/     # main bot, business commerce engine, bot manager
│       ├── pdf/           # invoice/receipt generation (PDFKit)
│       ├── ai/            # Gemini, with graceful degradation
│       ├── scripts/seed.js
│       └── tests/
├── README.md
├── .gitignore
└── LICENSE
```

---

Powered by Cymor Tech Services.
