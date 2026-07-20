import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

// ─── Resume Rewriter ────────────────────────────────────────────────────────

export async function rewriteResumeBullets(
  resumeText: string,
  jobDescription: string,
  missingKeywords: string[]
): Promise<string> {
  const prompt = `
You are an expert resume coach helping a candidate tailor their resume for a specific job.

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME:
${resumeText}

MISSING KEYWORDS IDENTIFIED:
${missingKeywords.join(", ")}

TASK:
Rewrite the experience and projects section of this resume to:
1. Naturally incorporate the missing keywords where relevant and honest
2. Add measurable impact wherever possible (use realistic numbers)
3. Use strong action verbs
4. Keep it ATS-friendly and concise

Return ONLY the rewritten bullet points in this format:
- [Rewritten bullet point]
- [Rewritten bullet point]

Do not add fabricated experience. Only improve what already exists.
`.trim();

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─── Cover Letter Generator ──────────────────────────────────────────────────

export async function generateCoverLetter(
  resumeText: string,
  jobDescription: string,
  matchedSkills: string[]
): Promise<string> {
  const prompt = `
You are an expert career coach who writes compelling, personalized cover letters.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${resumeText}

MATCHED SKILLS:
${matchedSkills.join(", ")}

TASK:
Write a professional cover letter (3-4 paragraphs) that:
1. Opens with a strong hook referencing the specific role
2. Highlights 2-3 most relevant achievements from the resume
3. Connects the candidate's skills to the job's specific needs
4. Closes with a confident call to action

Keep it under 350 words. Sound human and enthusiastic, not robotic.
`.trim();

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ─── Interview Question Predictor ────────────────────────────────────────────

export async function predictInterviewQuestions(
  jobDescription: string,
  missingSkills: string[],
  matchedSkills: string[]
): Promise<{ technical: string[]; behavioral: string[]; gapBased: string[] }> {
  const prompt = `
You are a senior technical interviewer preparing questions for a candidate.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE'S MATCHED SKILLS:
${matchedSkills.join(", ")}

CANDIDATE'S SKILL GAPS:
${missingSkills.join(", ")}

TASK:
Generate interview questions in this exact JSON format:
{
  "technical": ["question1", "question2", "question3", "question4", "question5"],
  "behavioral": ["question1", "question2", "question3"],
  "gapBased": ["question1", "question2", "question3"]
}

Rules:
- technical: questions testing the matched skills deeply
- behavioral: STAR-format situational questions relevant to the role
- gapBased: questions that will expose the skill gaps (so the candidate can prepare)

Return ONLY valid JSON. No extra text.
`.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Invalid response from Gemini");
  }

  return JSON.parse(jsonMatch[0]);
}
