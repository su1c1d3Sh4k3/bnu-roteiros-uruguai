# CLAUDE.md

This file provides guidance to Claude Code (claude.com/claude-code) when working with code in this repository.

## Project

Trip planner for "Brasileiros no Uruguai" (BNU), a tourism agency. Users build Uruguay itineraries via a wizard, get AI-generated plans, and chat with "Rodrigo" (AI assistant). Includes a full admin panel (`/admin`) for managing tours, cities, hotels, transfers, combos, and the AI prompt/documents.

**No user login**: visitors get an automatic anonymous Supabase session (Anonymous Sign-ins enabled). Client identity comes from nome/whatsapp/email collected in wizard step 1 (`itinerary_answers`). Itineraries can be recovered on another device via the RPC `claim_itineraries_by_contact` (matches email or last 8 phone digits, reassigns `user_id`). Admin logs in with email/password directly on `/admin` (inline form in `AdminRoute.tsx`). `LoginPage.tsx`/`RegisterPage.tsx` exist but are unrouted (kept for possible future use).

## Architecture

- **`frontend/`** — React 19 + Vite + TypeScript + React Router 7 + Supabase JS
  - `src/pages/` — WelcomePage, WizardPage, ResultPage, MyItinerariesPage, AdminPage (LoginPage/RegisterPage unrouted)
  - `src/components/admin/` — admin panel tabs; `AdminRoute.tsx` / `ProtectedRoute.tsx` guard routes
  - `src/contexts/AuthContext.tsx` — auth state; `src/lib/supabase.ts` — Supabase client
- **`supabase/`** — backend (Supabase: Auth, PostgreSQL, Edge Functions in Deno)
  - `functions/` — `chat-assistant`, `generate-itinerary`, `send-email`, `send-to-consultant`; `_shared/knowledge.ts` is the fallback AI knowledge base
  - `migrations/` — numbered SQL migrations (00001–00020); RLS policies, `public.is_admin()`, seasonal rules, combos, tour scheduling
- **`tests/`** — Python pytest suite (httpx + asyncio) hitting the Supabase REST/Edge APIs (`tests/backend/`) and UI (`tests/frontend/`); config via `.env` (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, FRONTEND_URL)
- **`docs/PRD.md`** — product requirements
- **`base_conhecimento_ia.md`** — AI knowledge base content

## AI integration

- Edge Functions call OpenAI (key in Supabase Secrets as `OPENAI_API_KEY`)
- Rodrigo's system prompt is editable via admin, stored in `ai_prompt_config` (id=1), with fallback to `_shared/knowledge.ts`; context documents in `ai_documents`
- Rodrigo's tone: light and professional, no slang (see commit ad7ac00)

## Commands

```bash
# Frontend (run from frontend/)
npm run dev        # Vite dev server (localhost:5173)
npm run build      # tsc -b && vite build
npm run lint       # eslint

# Tests (run from tests/)
pytest             # runs backend + frontend suites (asyncio_mode=auto)
```

## Deployment

- Production deploys automatically: push to `main` → EasyPanel (VPS) webhook rebuilds via `frontend/Dockerfile` (Node build + nginx)
- No GitHub Actions; EasyPanel is the pipeline
- Env vars set in EasyPanel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Conventions

- Commit messages in Portuguese, conventional-commit style (`feat:`, `fix:`)
- Always `git push` after each change (user directive)
- Test end-to-end before finalizing any change (user directive)
- Admin access requires `is_admin = true` in `profiles` (set via `SELECT public.set_admin('email')`)
- Supabase Storage buckets: `tour-images`, `ai-documents` (public)
