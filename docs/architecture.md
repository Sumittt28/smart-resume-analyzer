# Architecture

## Overview

Smart Resume Analyzer is implemented as a unified Next.js fullstack application. The user-facing interface, API routes, authentication flow, persistence, and NLP logic live in one repository so the project is easy to run locally and deploy as a single service.

## Layers

### Presentation Layer

- `app/`
- authentication pages
- dashboard
- result page
- upload and analysis flows

This layer handles user interaction, upload progress, result visualization, and report download.

### API Layer

- `app/api/`
- auth routes
- upload route
- analyze route
- dashboard/history routes
- analysis detail routes

The API layer validates requests, enforces authentication, stores records, and calls the analysis engine.

### Analysis Layer

- `lib/resume-analyzer.ts`

This module performs:

- text normalization
- skill extraction
- structured resume/JD parsing
- TF-IDF + cosine similarity context scoring
- experience estimation
- domain-aware recommended skill generation
- explainable score breakdowns

### Auth Layer

- `lib/auth.ts`
- `middleware.ts`
- `app/api/auth/*`

Authentication uses JWT cookies with protected routes enforced through middleware and API checks.

### Persistence Layer

- `lib/db.ts`
- `models/`

Mongoose is used for database models and MongoDB connectivity. Local development can fall back to an in-memory MongoDB instance if `MONGODB_URI` is not available.

## Request Flow

1. User authenticates
2. User uploads a PDF resume
3. PDF text is extracted and stored
4. User submits a job description
5. The analysis engine computes:
   - matched skills
   - missing skills
   - context similarity
   - experience alignment
   - recommendations and explanations
6. The analysis result is stored and shown on the result page

## Deployment Model

This project is designed to run as a single Next.js deployment:

- frontend pages served by Next.js
- backend APIs served by Next.js route handlers
- MongoDB for persistence

That keeps deployment simple for GitHub showcases and hosting platforms such as Vercel, Railway, Render, or a self-managed Node environment.
