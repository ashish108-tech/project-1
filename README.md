# HealthConnect AI

**AI-Powered Integrated Healthcare and Home Diagnostic Assistance Platform for Rural, Semi-Urban, and Urban Communities**

HealthConnect AI is a production-oriented healthcare coordination platform built with Next.js, TypeScript, Tailwind CSS, Supabase PostgreSQL/Auth/Storage, and an OpenAI-compatible AI provider. It supports patient care navigation, consent-based clinical collaboration, diagnostic testing, home sample collection, private reports, and safety-oriented health information.

## What the platform provides

- Patient, doctor, collection-agent, and admin portals
- Supabase Auth with server-side session refresh
- PostgreSQL Row Level Security on healthcare tables
- Consent-based doctor access to patient records
- Appointment, consultation, prescription, test-order, collection, report, notification, and timeline workflows
- Private medical-report files with short-lived signed downloads
- Deterministic urgent/non-urgent symptom triage
- Approved-source medical RAG with embeddings and similarity search
- English/Hindi-ready shared localization resources
- Healthcare facility coordinates, nearby sorting, map, and directions links
- Vercel deployment readiness and public health monitoring endpoint

## Fixed architecture

| Layer | Technology |
|---|---|
| UI | Next.js App Router, React, TypeScript, Tailwind CSS v4, shadcn-style primitives |
| Application/API | Next.js server components and route handlers |
| Auth/session | Supabase Auth, `@supabase/ssr`, `proxy.ts` session refresh |
| Database | Supabase PostgreSQL only; migrations in `supabase/migrations/` |
| Authorization | PostgreSQL RLS, database authorization functions, server-side checks |
| Files | Private Supabase Storage bucket `medical-reports` |
| AI | OpenAI-compatible chat and embedding provider, server-only API key |
| Deployment | Vercel connected to GitHub |
| Location | Facility coordinates and Google Maps links; no external directory |

## Quick start

```bash
cp .env.example .env.local
# Fill .env.local with the existing Supabase project values.
npm install
npm run dev
```

Open `http://localhost:3000`.

Production validation:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run start -- -p 3001
curl http://localhost:3001/api/health
```

## Environment variables

See [`.env.example`](.env.example) and [production deployment](docs/phase-21-production-deployment.md). Never commit `.env.local` or place a service-role/secret key in browser-exposed variables.

## Documentation

- [Technical architecture](docs/technical-architecture.md)
- [Setup and environment](docs/setup.md)
- [Database and migrations](docs/database.md)
- [API reference](docs/api.md)
- [Deployment and monitoring](docs/phase-21-production-deployment.md)
- [Testing strategy and Phase 20 results](docs/phase-20-end-to-end-testing.md)
- [Final project documentation](docs/phase-22-final-documentation.md)
- [Phase-by-phase implementation notes](docs/)

## Medical AI safety

HealthConnect AI is **not an autonomous doctor**. Its assistant provides preliminary information and safety-oriented triage only. It must not diagnose, prescribe, replace a clinician, invent medical evidence, or present uncertain information as certain. Urgent signals receive emergency-oriented guidance, and AI responses are grounded only in approved knowledge sources when retrieval is used.

For emergencies, users must contact local emergency services or attend the nearest emergency department.

## License and operational responsibility

This repository is an implementation project, not a substitute for clinical governance, regulatory review, medical-device assessment, privacy counsel, incident response, or production operations. Before launch, the operating organization must configure Supabase Auth, backups, monitoring, retention, support, and jurisdiction-specific compliance controls.
