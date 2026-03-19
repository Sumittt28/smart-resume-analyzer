# Scoring Logic

## Final Score Formula

```text
Match Score = (Skills × 0.5) + (Context × 0.3) + (Experience × 0.2)
```

The analyzer keeps this weighting deterministic so results remain explainable and stable across runs.

## Skills Score

The skills score measures how many recognized job-description skills are present in the resume.

It includes:

- normalized skills and aliases
- deterministic skill matching
- missing skill detection

Example:

- JD skills: `react`, `typescript`, `jest`
- Resume skills: `react`
- Skills score reflects partial coverage

## Context Score

The context score uses:

- TF-IDF vectorization
- cosine similarity

It compares normalized language from the resume and job description to estimate how closely the resume responsibilities and project language align with the target role.

## Experience Score

The experience score considers:

- detected years of experience from date ranges
- internship-aware duration handling
- role alignment signals
- overlap in supporting technologies

Internships are treated as valid experience and contribute fractional years when date ranges are found.

## Explainability

Each analysis stores:

- overall weighted score
- score breakdown for skills, context, and experience
- short reason lines for each score

This prevents the result from acting like a black box and makes the report easier to understand in recruiter-style reviews.

## Recommendations

Recommended skills are domain-aware and deterministic:

- backend JD -> backend-oriented recommendations
- frontend JD -> frontend-oriented recommendations
- general JD -> general engineering recommendations

This logic is intentionally separated from the score formula so recommendations can improve relevance without changing the scoring model itself.
