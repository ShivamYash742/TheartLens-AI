# Antigravity Build Prompt: ThreatLens AI

## Project Overview

Build a production-ready web application named **"ThreatLens AI"** that converts unstructured security reports (PDF/text files) into structured insights. The application should prioritize speed, reliability, and a working demo for a hackathon context. The primary goal is to deliver a functional MVP with a clean architecture.

## Core Features (MVP)

1.  **User Authentication:** Email/password login via Clerk with session persistence and protected routes.
2.  **Document Upload & Processing:** Allow users to upload PDF/text files, extract text, and simulate NLP (regex/keywords) to identify threats.
3.  **Threat Management (CRUD):** Store extracted threats (type, CVE, severity, affected system) in a PostgreSQL database (Supabase) and enable viewing, creating, and managing these records.
4.  **Dashboard UI:** Display threats in a table and provide a "Top Threats" summary panel.

## Non-Functional Requirements

- **Performance:** Page load < 2s, API response < 500ms.
- **Accessibility:** Semantic HTML, keyboard navigation.
- **Responsiveness:** Mobile and desktop compatibility.
- **Security:** Supabase RLS policies, protected routes, Zod for input validation.

## Technology Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS.
- **Backend:** Supabase (Auth, Postgres).
- **State Management:** React hooks + context.
- **Utilities:** Zod (validation), `pdf-parse` (text extraction).

## Architecture & Data Model

### Database Schema (SQL)

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  email text
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  filename text,
  content text,
  created_at timestamp default now()
);

create table threats (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  type text,
  cve text,
  severity text,
  affected_system text,
  created_at timestamp default now()
);
```

### Folder Structure

```
/app
  /login
  /dashboard
  /upload
  /resource/[id]

/components
  Navbar.tsx
  FileUpload.tsx
  ThreatTable.tsx
  ThreatCard.tsx

/lib
  supabaseClient.ts
  extractor.ts
  validators.ts

/types
  index.ts
```

### Component Hierarchy

- Layout
  - Navbar
  - Page
    - Upload Component
    - Dashboard
      - ThreatTable
      - ThreatSummary

### Server Actions / API Plan

Use Next.js Server Actions for:

- `uploadDocument()`
- `extractThreats()`
- `fetchThreats()`

## Implementation Plan (Phase 1 - MVP)

1.  **Setup:** Initialize Next.js + Supabase, configure environment variables.
2.  **Auth:** Implement login/signup UI, session handling, and protected routes using Clerk.
3.  **Core Feature:** Develop file upload, text parsing, and threat extraction logic.
4.  **Database:** Create tables and apply RLS policies.
5.  **Dashboard:** Build table view and summary cards.
6.  **Polish:** Add loading states, error handling, and ensure responsive UI.

## Deliverables

- Full project scaffold.
- Key components implemented.
- Working CRUD flow for threats.
- Clean UI with Tailwind CSS.
- Minimal but functional implementation, prioritizing a working demo.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
and clerk as well
```

## Example Pages

- `/login` → authentication
- `/dashboard` → threat overview
- `/resource/[id]` → threat details

## Testing & Deployment

- **Testing:** Manual testing, Zod input validation, auth, and protected routes.
- **Deployment:** Vercel, with environment variables in dashboard, connected Supabase project, and enabled RLS policies.
