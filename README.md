# Happy Lending

Personal loan tracker: contacts, loans with reducing-balance EMI/interest, WhatsApp confirmation links, proof-of-transaction uploads with a digital signature, payment status, and closure PDFs.

## Setup

```bash
npm install
npx drizzle-kit migrate   # creates sqlite.db from lib/db/schema.ts
npm run dev
```

The dev server runs on port 4949 (see `npm run dev`).

`.env.local` holds:

- `APP_PASSWORD` — the single shared password that gates the whole site
- `SESSION_SECRET` — random string for session cookie encryption
- `DATABASE_URL` / `DATABASE_AUTH_TOKEN` — optional for local dev (defaults to the local `./sqlite.db` file); required in production, pointing at a Turso database
- `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` — Cloudflare R2 bucket for file uploads (signatures, screenshots). Required even in local dev, since uploads always go through R2.

Change `APP_PASSWORD` from the placeholder before relying on this for real.

## Data

- Database: libSQL via `@libsql/client` (`lib/db/index.ts`) — a local `sqlite.db` file in dev, a hosted [Turso](https://turso.tech) database in production. Same schema and driver either way.
- Uploads: Cloudflare R2 via the S3-compatible API (`lib/uploads.ts`) — screenshots and signatures, served only through the authenticated `/api/attachments/[id]` route.

## Deploying for free (Vercel + Turso + R2)

1. **Turso** (hosted SQLite-compatible DB, free tier): create a database at [turso.tech](https://turso.tech), grab its `libsql://...` URL and an auth token. Set them as `DATABASE_URL` / `DATABASE_AUTH_TOKEN`. Run `npx drizzle-kit migrate` once locally against the Turso URL to create the schema there.
2. **Cloudflare R2** (object storage, free tier up to 10GB): create a bucket, an API token (Account ID, Access Key ID, Secret Access Key), set `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME`.
3. **Vercel** (hosting, free Hobby tier): import this repo, add all the env vars above (`APP_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `R2_*`) in the project settings, deploy.

## Stack

Next.js (App Router, server actions) · Drizzle ORM + libSQL (Turso) · Cloudflare R2 · iron-session · react-signature-canvas · @react-pdf/renderer
