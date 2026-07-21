# Smart Resume Analyzer

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-4ea94b)](https://www.mongodb.com/atlas)
[![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8)](https://tailwindcss.com/)

A fullstack ATS-style resume analyzer that compares resumes against job descriptions using custom NLP (TF-IDF, cosine similarity, lemmatization) and enhances the experience with Gemini AI-powered features.

**Live Demo:** https://smart-resume-analyzer-kappa.vercel.app

## Features

### Core Analysis (Custom NLP)
- **PDF Resume Upload** — text extraction using pdf-parse
- **Skill Detection** — rule-based parsing with 300+ skill aliases
- **TF-IDF Vectorization** — term frequency-inverse document frequency weighting
- **Cosine Similarity** — semantic context matching between resume and job description
- **Lemmatization** — custom word normalization (e.g., "running" → "run")
- **Weighted Scoring** — Skills (50%) + Context (30%) + Experience (20%)
- **Gap Analysis** — identifies missing skills and keywords
- **Explainable Results** — breakdown showing why each score was given

### AI Features (Gemini API)
- **✏️ Resume Bullet Rewriter** — rewrites weak bullets incorporating missing keywords
- **📄 Cover Letter Generator** — creates tailored cover letters based on resume + JD
- **🎯 Interview Prep** — predicts technical, behavioral, and gap-based questions

### Other Features
- JWT-based authentication (register, login, logout)
- Analysis history dashboard
- Downloadable PDF reports
- Protected routes with middleware

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes, Node.js |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT (jsonwebtoken), bcrypt |
| PDF Parsing | pdf-parse |
| AI | Google Gemini API (@google/generative-ai) |
| NLP | Custom implementation (TF-IDF, cosine similarity, lemmatization) |

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Upload PDF  │────▶│ Extract Text │────▶│ Tokenize +      │
│ + Paste JD  │     │ (pdf-parse)  │     │ Lemmatize       │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                  │
                    ┌──────────────┐     ┌────────▼────────┐
                    │ Detect       │◀────│ Build TF-IDF    │
                    │ Skills/Gaps  │     │ Vectors         │
                    └──────┬───────┘     └────────┬────────┘
                           │                      │
                    ┌──────▼───────┐     ┌────────▼────────┐
                    │ Calculate    │◀────│ Cosine          │
                    │ Final Score  │     │ Similarity      │
                    └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────▼───────┐
                    │ Store in     │
                    │ MongoDB      │
                    └──────────────┘
```

### Scoring Formula
```
Match Score = (Skills × 0.5) + (Context × 0.3) + (Experience × 0.2)
```

- **Skills Score** — % of JD skills found in resume
- **Context Score** — TF-IDF cosine similarity between resume and JD text
- **Experience Score** — years alignment + responsibility overlap

## Project Structure

```
smart-resume-analyzer/
├── app/
│   ├── api/
│   │   ├── auth/          # register, login, logout, me
│   │   ├── upload/        # PDF upload + text extraction
│   │   ├── analyze/       # NLP analysis endpoint
│   │   ├── analysis/      # fetch analysis results
│   │   ├── dashboard/     # user's analysis history
│   │   └── ai/            # Gemini features
│   │       ├── rewrite/
│   │       ├── cover-letter/
│   │       └── interview-prep/
│   ├── dashboard/         # main dashboard page
│   ├── result/[id]/       # analysis result page
│   ├── login/
│   └── register/
├── lib/
│   ├── resume-analyzer.ts # core NLP engine (TF-IDF, cosine, lemmatization)
│   ├── gemini.ts          # Gemini API integration
│   ├── auth.ts            # JWT utilities
│   └── db.ts              # MongoDB connection
├── models/
│   ├── User.ts
│   ├── Resume.ts
│   └── Analysis.ts
└── types/
    └── pdf-parse.d.ts
```

## Installation

### 1. Clone
```bash
git clone https://github.com/Sumittt28/smart-resume-analyzer.git
cd smart-resume-analyzer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smart-resume-analyzer
JWT_SECRET=your-secure-random-secret
APP_BASE_URL=http://localhost:3000
GEMINI_API_KEY=your-gemini-api-key
```

Get a Gemini API key at: https://aistudio.google.com/app/apikey

### 4. Run
```bash
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

1. Import repository to Vercel
2. Add environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `APP_BASE_URL`
   - `GEMINI_API_KEY`
3. Deploy

## Usage

1. **Register/Login** — create an account
2. **Upload Resume** — PDF only, text-based works best
3. **Paste Job Description** — full JD text
4. **View Analysis** — score breakdown, matched/missing skills, suggestions
5. **Use AI Features**:
   - Click "Rewrite Resume Bullets" to improve weak points
   - Click "Generate Cover Letter" for a tailored letter
   - Click "Interview Prep" to see likely questions

## Screenshots

| Dashboard | Analysis Result |
|-----------|-----------------|
| Upload resume + paste JD | Score breakdown + AI features |

## What Makes This Different

Most resume analyzers use simple keyword matching. This project:

1. **Custom NLP** — TF-IDF vectorization + cosine similarity for semantic matching, not just keyword counting
2. **Explainable Scores** — every score comes with reasons
3. **Gemini AI** — goes beyond analysis to help you improve

## Contributing

PRs welcome. Please open an issue first to discuss changes.

## Author

**Sumit Kumar Singh**  
GitHub: [@Sumittt28](https://github.com/Sumittt28)

## License

MIT
