# Phase 5 — Medical RAG

HealthConnect AI now supports retrieval-augmented generation over an approved medical knowledge base stored in the connected Supabase project. The vector extension is `pgvector`; embeddings use the catalog-verified `text-embedding-3-small` model and are stored as 1,536-dimensional vectors.

## Architecture

Approved source text is stored in `medical_knowledge_sources`. The ingestion service normalizes and chunks text with overlap, requests an embedding for each chunk, and stores the chunks in `medical_knowledge_chunks`. The `match_medical_knowledge` SQL function performs cosine-distance similarity search and returns only chunks belonging to approved sources.

During a patient AI request, deterministic urgent triage still runs first. Non-urgent requests are embedded, matched against approved evidence, and passed to the server-only chat provider with source titles and source labels. The model is instructed to use only supplied evidence and cite it as `[Source 1]`, `[Source 2]`. If no approved evidence reaches the similarity threshold, the API returns a clear insufficient-evidence response rather than presenting unsupported medical claims.

## Adding approved documents later

An administrator can send reviewed source text to `POST /api/admin/rag/ingest` with `title`, `source`, `content`, and optional `isApproved: true`. The route requires Supabase Auth and the database `is_admin()` check. Use `isApproved: false` while a source is awaiting review; only approved sources enter retrieval. Future document-upload work can extract text from private Supabase Storage files and call the same ingestion service.

The ingestion endpoint currently accepts text, not arbitrary files. It limits titles, source labels, and content length, deletes a source if chunk embedding fails, and never exposes embedding provider credentials to the browser.

## Safety and security

All source and chunk tables have RLS. Patients can select approved knowledge only; administrators manage source approval and chunk lifecycle. The chat route continues to require an authenticated patient, preserves urgent emergency guidance, never fabricates citations, and reports provider or retrieval failures without inventing a response.

Required server variables are:

```env
OPENAI_API_KEY=
OPENAI_API_BASE=
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```
