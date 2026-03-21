# Product Requirements Document (PRD): ThreatLens AI

## 1. Product Overview

**Product Name:** ThreatLens AI
**Target Audience:** Security analysts, hackathon judges, and IT professionals.
**Primary Goal:** To convert unstructured security reports (PDFs, text files) into structured, actionable insights rapidly and reliably.
**Key Value Proposition:** Speed and simplicity. ThreatLens AI provides a streamlined pipeline from document upload to threat extraction and visualization, eliminating backend complexity and focusing on a high-impact working demo.

## 2. Problem Statement

Security professionals often deal with unstructured data in the form of security reports, vulnerability disclosures, and incident logs. Manually extracting key threat indicators (like CVEs, severity levels, and affected systems) is time-consuming and prone to error. There is a need for a lightweight, fast, and reliable tool that automates this extraction process and presents the data in an easily digestible format.

## 3. Scope and Features

### 3.1. Minimum Viable Product (MVP) - Phase 1

The MVP focuses on the core pipeline: Upload → Extract → Display.

- **User Authentication:**
  - Secure email and password login powered by Clerk.
  - Session persistence to maintain user state across reloads.
  - Protected routes ensuring only authenticated users can access the dashboard and upload features.
- **Document Upload & Processing:**
  - Support for uploading PDF and plain text files.
  - Text extraction capabilities (utilizing `pdf-parse` or similar utilities).
  - Simulated Natural Language Processing (NLP) using regex or keyword matching to identify threats.
- **Threat Management (CRUD Operations):**
  - Storage of extracted threat data in a PostgreSQL database (via Supabase).
  - Data fields captured: Threat Type, CVE Identifier, Severity Level, and Affected System.
  - Ability to view, create, and manage these records.
- **Dashboard User Interface:**
  - A comprehensive table view displaying all extracted threats.
  - A "Top Threats" summary panel providing a quick overview of the most critical issues.

### 3.2. Future Enhancements - Phase 2

- **Realtime Updates:** Implementing Supabase subscriptions to reflect database changes instantly on the frontend without page reloads.
- **File Storage Integration:** Utilizing Supabase Storage to securely store and manage uploaded document files.
- **Role-Based Access Control (RBAC):** Differentiating between standard users and administrators with specific permissions.
- **Advanced Analytics:** Incorporating charts and graphs for deeper visual insights into threat trends.

## 4. Non-Functional Requirements

- **Performance:**
  - Page load times must be under 2 seconds.
  - API response times must be under 500 milliseconds.
- **Accessibility:**
  - Strict adherence to semantic HTML.
  - Full support for keyboard navigation.
- **Responsiveness:**
  - The application must provide a seamless experience across both mobile and desktop devices.
- **Security:**
  - Implementation of Supabase Row Level Security (RLS) policies to ensure data privacy.
  - Strict input validation on both client and server sides using Zod.

## 5. Technical Architecture

### 5.1. Technology Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS.
- **Backend & Database:** Supabase (Auth, Postgres).
- **State Management:** React Hooks and Context API (Redux is explicitly excluded to maintain simplicity).
- **Utilities:** Zod (for schema validation), `pdf-parse` (for document text extraction).

### 5.2. Database Schema

The application relies on a relational PostgreSQL database with the following core tables:

- **`profiles`**: Links to Supabase Auth users, storing basic user information (id, email).
- **`documents`**: Stores metadata about uploaded files (id, user_id, filename, content, created_at).
- **`threats`**: Stores the structured data extracted from documents (id, document_id, type, cve, severity, affected_system, created_at).

### 5.3. Application Structure

The project will follow a standard Next.js App Router structure:

- **Routes:** `/login`, `/dashboard`, `/upload`, `/resource/[id]`
- **Components:** `Navbar`, `FileUpload`, `ThreatTable`, `ThreatCard`
- **Server Actions:** `uploadDocument()`, `extractThreats()`, `fetchThreats()`

## 6. Implementation Strategy

The development will prioritize a working demo over theoretical completeness, adhering to a clean architecture without overengineering.

1.  **Setup & Configuration:** Initialize Next.js, configure Supabase, and set environment variables.
2.  **Authentication:** Build login/signup UI and implement session handling.
3.  **Core Pipeline:** Develop the file upload component, integrate text parsing, and implement the threat extraction logic.
4.  **Database Integration:** Create tables and enforce RLS policies.
5.  **Dashboard Development:** Build the table view and summary cards.
6.  **Polish & Testing:** Add loading states, error handling, ensure responsiveness, and conduct manual testing.

## 7. Deployment

The application will be deployed on Vercel, with environment variables securely configured in the Vercel dashboard. The Supabase project will be connected, and RLS policies will be enabled in the production environment.
