# Setup Guide

## Prerequisites

- Node.js 22+
- npm or pnpm
- Access to the existing HealthConnect Supabase project
- OpenAI-compatible provider credentials for AI/RAG development

## Install

```bash
git clone <connected-github-repository>
cd healthconnect-ai
npm install
cp .env.example .env.local
```

## Environment variables

Set these in `.env.local` for local development and in Vercel for production:

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/server | Existing Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser/server | Publishable key; RLS must protect all data |
| `OPENAI_API_KEY` | Server only | Chat/embedding provider key; never expose to client code |
| `OPENAI_API_BASE` | Server only, optional | OpenAI-compatible API base URL |
| `OPENAI_MODEL` | Server only, optional | Defaults to `gpt-5-mini` |
| `OPENAI_EMBEDDING_MODEL` | Server only, optional | Defaults to `text-embedding-3-small` |

Never add a `NEXT_PUBLIC_` prefix to a secret. Never set a service-role or `sb_secret_*` key in this application.

## Run locally

```bash
npm run dev
```

Useful checks:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run start -- -p 3001
curl http://localhost:3001/api/health
```

## Database setup

Database changes are SQL migrations in `supabase/migrations/`. Apply them to the connected Supabase project through the approved Supabase migration workflow. Do not create a second database or use a local replacement database for production behavior.

After applying migrations, verify:

- RLS is enabled on all healthcare tables.
- `medical-reports` is private.
- Storage policies allow only authorized paths.
- Phase 19 security migration is applied.

See [database setup](database.md).

## Auth setup

Configure Supabase Auth email/password and confirmation policies in the project dashboard. For deployed environments, add the Vercel production URL and intentionally used preview URLs to Supabase Auth Site URL/redirect allowlists.

## Test accounts

Use disposable, non-production accounts. The Phase 20 client harness accepts `E2E_*` variables, but the connected project must provision confirmed Auth users through an authorized Auth-admin workflow. Never run test fixtures against real patient records.

## AI knowledge sources

Only ingest approved medical sources through the admin RAG ingestion route. Record title, source, approval status, and provenance. Do not use unverified web content as a clinical knowledge base.
