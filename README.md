# Happy Lending

Personal loan tracker: contacts, loans with reducing-balance EMI/interest, WhatsApp confirmation links, proof-of-transaction uploads with a digital signature, payment status, and closure PDFs.

## Setup

```bash
npm install
npx drizzle-kit migrate   # creates sqlite.db from lib/db/schema.ts
npm run dev
```

The dev server picks whatever port is free (check the terminal output — defaults to 3000, falls back to 3001 etc. if taken).

`.env.local` holds:

- `APP_PASSWORD` — the single shared password that gates the whole site
- `SESSION_SECRET` — random string for session cookie encryption
- `DATABASE_PATH` — path to the SQLite file (default `./sqlite.db`)

Change `APP_PASSWORD` from the placeholder before relying on this for real.

## Data

- `sqlite.db` — all contacts/loans/payment logs (gitignored)
- `uploads/` — screenshots and signatures, served only through the authenticated `/api/attachments/[id]` route (gitignored)

Both are local-filesystem only. Before deploying to Vercel (or any platform with an ephemeral filesystem), swap SQLite for a hosted Postgres and uploads for object storage (e.g. Vercel Blob) — `lib/db/index.ts` and `lib/uploads.ts` are the two places that would change.

## Stack

Next.js (App Router, server actions) · Drizzle ORM + better-sqlite3 · iron-session · react-signature-canvas · @react-pdf/renderer
