# Phase 21 — Production Deployment and Monitoring

## Deployment target

HealthConnect AI is prepared for deployment through **GitHub → Vercel → the existing Supabase project**. No replacement database, built-in authentication, service-role key, or alternative file store is used.

The repository is ready for the user to connect to Vercel. This phase does not publish a separate hosting environment or change external Vercel settings.

## Vercel environment variables

Configure these variables in Vercel for **Production**, and normally also Preview when using a non-production Supabase project:

| Variable | Required | Purpose |
|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Existing Supabase project URL. Safe to expose to the browser. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable/anon key. RLS is the security boundary. Never replace it with a service-role key. |
| `OPENAI_API_KEY` | Yes for AI/RAG | Server-only OpenAI-compatible provider key. Never use a `NEXT_PUBLIC_` prefix. |
| `OPENAI_API_BASE` | Optional | OpenAI-compatible API base URL; omit when using the default provider endpoint. |
| `OPENAI_MODEL` | Optional | Chat model; defaults to `gpt-5-mini` in the project template. |
| `OPENAI_EMBEDDING_MODEL` | Optional | Embedding model; defaults to `text-embedding-3-small` in the project template. |

`.env.local` is ignored by Git and must not be uploaded or committed. Keep `.env.example` secret-free and synchronized with this list.

## Supabase production configuration

Before switching traffic to a production domain:

1. Confirm the target project is the existing HealthConnect Supabase project.
2. Confirm all repository migrations are applied, including Phase 19 security hardening.
3. In Supabase Auth, set the production Site URL and add the Vercel production URL plus all intentionally used preview/callback URLs to the allowed redirect URLs.
4. Keep email confirmation and password recovery policies appropriate for the deployment environment.
5. Confirm RLS is enabled on every healthcare table and the `medical-reports` Storage bucket remains private.
6. Confirm Storage file limits and MIME restrictions remain active.
7. Never add `service_role`, `sb_secret_*`, or database passwords to Vercel client-exposed variables.

The live migration inventory was checked on 2026-10-04 and includes the Phase 19 migration `phase_19_security_audit`.

## Health and monitoring

Public health endpoints:

- `GET /api/health`
- `GET /api/health/supabase`

A healthy response is HTTP 200 with `{ "ok": true, "service": "supabase" }`. A database/configuration failure returns HTTP 503 with a generic message and no secrets or database details.

Recommended Vercel monitoring:

- Add an uptime check for `https://<production-domain>/api/health` every 1–5 minutes.
- Alert on three consecutive non-200 responses or sustained latency above the agreed threshold.
- Review Vercel Functions logs for 5xx responses, authentication failures, report upload failures, and AI provider failures.
- Do not log request bodies, medical notes, report contents, tokens, passwords, or signed URLs.

Recommended Supabase monitoring:

- Review Auth logs for unusual failed-login spikes and unexpected redirect errors.
- Review Postgres logs for RLS denials, function errors, and migration failures.
- Review Storage logs for rejected uploads/downloads and unusual access patterns.
- Configure database backups and point-in-time recovery according to the Supabase production plan.

Monitoring setup is intentionally documented rather than silently creating an external monitoring account or subscription. The health route is the integration point for Vercel, Better Uptime, UptimeRobot, or an organization-approved equivalent.

## Release procedure

1. Run `npm run lint` and `npm run build` locally.
2. Review the Git diff and ensure `.env.local` is not tracked.
3. Push to the connected GitHub branch.
4. Let Vercel build the exact commit; stop if the build fails.
5. Set and verify Vercel environment variables before the first production request.
6. Check `/api/health` from the deployed domain.
7. Smoke-test login, patient dashboard, doctor/agent/admin authorization failures, AI safe-failure behavior, and private report download.
8. Inspect Vercel and Supabase logs for the first deployment window.

## Rollback procedure

Use Vercel’s deployment rollback to the last known-good commit. Do not roll back database migrations by deleting migration records or issuing destructive SQL. For schema changes, prepare a forward-compatible corrective migration and verify RLS before release.

## Validation completed in this phase

- `npm run lint` / strict TypeScript validation
- `npx tsc --noEmit`
- `npm run build`
- Production health endpoint route included in the build
- Local and public sandbox `GET /api/health` smoke tests returned HTTP 200 with the expected Supabase health payload and security headers
- Git working tree and secret scan checked
- Connected Supabase migration inventory verified

## Known deployment caveat

The project currently uses Google Maps links and coordinates rather than a browser Maps SDK. No Google Maps API key is required for the current Phase 17 behavior. If a Maps SDK is introduced later, add its publishable browser key separately and keep server-side restrictions and allowed origins configured.
