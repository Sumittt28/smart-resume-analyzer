# Smart Resume Analyzer

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-API-3c873a)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-4ea94b)](https://mongoosejs.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8)](https://tailwindcss.com/)

Smart Resume Analyzer is a fullstack ATS-style web application that compares uploaded resumes against job descriptions using structured parsing, skill normalization, TF-IDF + cosine similarity, and explainable scoring. It is built as a unified Next.js application, with the frontend UI and backend API routes living in the same codebase for simpler deployment and maintenance.

## Overview

The project helps candidates understand how closely a resume matches a target role. It analyzes:

- skills coverage
- contextual alignment with job requirements
- experience relevance
- missing skills and keyword gaps
- domain-aware recommendations

The output is designed to feel like a practical ATS report instead of a simple keyword counter.

## Features

- PDF resume upload with text extraction
- authentication with registration, login, logout, and protected routes
- ATS-style analysis with weighted scoring
- TF-IDF + cosine similarity for context matching
- skill gap detection and missing skills reporting
- domain-aware recommended skills for frontend, backend, and general roles
- explainable score breakdown for skills, context, and experience
- analysis history dashboard
- downloadable PDF report
- deterministic smoke tests for analyzer logic and full application flow

## Tech Stack

### Frontend

- Next.js App Router
- React 19
- Tailwind CSS 4

### Backend

- Next.js Route Handlers
- Node.js runtime
- JWT-based authentication
- Mongoose

### Database

- MongoDB
- In-memory MongoDB fallback for local/dev safety and testing

### NLP & Analysis

- rule-based resume parsing
- skill normalization and alias mapping
- TF-IDF vectorization
- cosine similarity
- deterministic text preprocessing and lemmatization

## Project Structure

This repository uses a single Next.js fullstack architecture:

```text
app/                 UI routes + API routes
lib/                 analysis engine, auth, db utilities
models/              Mongoose models
public/              static assets
scripts/             smoke tests and local verification scripts
docs/                architecture and scoring documentation
middleware.ts        route protection
README.md            project overview and setup
```

Frontend and backend are logically separated inside the app:

- frontend: `app/`, page routes, client components, dashboard, result pages
- backend: `app/api/`, `lib/`, `models/`, auth/database/analysis services

## How It Works

1. Register or log in
2. Upload a PDF resume
3. Paste a job description
4. The analyzer:
   - extracts resume text
   - detects skills from the resume and JD
   - computes context similarity with TF-IDF + cosine similarity
   - estimates experience alignment
   - generates matched skills, missing skills, recommended skills, suggestions, and explanations
5. The app stores the analysis and shows a detailed report

## Scoring Logic

```text
Match Score = (Skills × 0.5) + (Context × 0.3) + (Experience × 0.2)
```

- Skills Score: percentage of recognized JD skills found in the resume
- Context Score: semantic similarity between resume and JD language using TF-IDF + cosine similarity
- Experience Score: alignment of years, role signals, and relevant responsibility overlap

More detail is available in [docs/scoring-logic.md](docs/scoring-logic.md).

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Sumittt28/smart-resume-analyzer.git
cd smart-resume-analyzer
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local env file from the example:

```bash
copy .env.example .env.local
```

Update the values in `.env.local` as needed.

### 4. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Usage

1. Create an account or sign in
2. Upload a text-based PDF resume
3. Paste a job description
4. Review:
   - overall match score
   - matched skills
   - missing skills
   - recommended skills
   - explanation for skills, context, and experience scores
5. Download the report as PDF if needed

## Verification

Run the project checks:

```bash
npm run lint
npm run test:analyzer
npm run test:e2e
npm run build
```

`test:e2e` expects the local app to be available at `http://localhost:3000`.

## Screenshots

Add screenshots or demo GIFs here:

- dashboard
- upload flow
- analysis result page
- downloadable report

## Example Output

```text
Match Score: 84%

Breakdown:
- Skills: 90%
- Context: 75%
- Experience: 80%

Matched Skills:
- react
- javascript
- css

Missing Skills:
- typescript
- jest

Recommended Skills:
- accessibility
- performance optimization

Suggestions:
- Add TypeScript if you have used it in relevant work
- Include measurable achievements in experience bullets
```

## Documentation

- [Architecture](docs/architecture.md)
- [Scoring Logic](docs/scoring-logic.md)

## Future Improvements

- embeddings-based similarity for richer semantic matching
- recruiter-facing comparison dashboard
- resume section quality scoring with charts
- support for more resume formats
- richer analytics and export options

## Contributing

Contributions are welcome. Open an issue or submit a pull request with a clear summary of the change and validation steps.

## Contact

Sumit Kumar  
GitHub: https://github.com/Sumittt28

## If You Like This Project

Give the repository a star and share it with others.
