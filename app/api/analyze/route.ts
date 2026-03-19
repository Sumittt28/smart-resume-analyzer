import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { verifyJwt, getTokenFromRequest } from "@/lib/auth";
import { analyzeResume, validateJobDescription } from "@/lib/resume-analyzer";
import Resume from "@/models/Resume";
import Analysis from "@/models/Analysis";

const ROLE_PHRASE_PATTERN =
  /\b((?:backend|frontend|software|full stack|fullstack)\s+(?:developer|engineer)(?:\s+intern)?|(?:developer|engineer)\s+intern|(?:backend|frontend|software)\s+intern|developer|engineer|intern)\b/i;
const SOFT_SKILL_LINE_HINTS = /\b(?:team-oriented|detail-oriented|self-motivated|fast learner|quick learner|communication|collaboration|adaptable|hardworking|ready to work|passionate)\b/i;

function cleanJobTitleCandidate(candidate: string) {
  return candidate
    .replace(/^[\s:;,-]+|[\s:;,-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRolePhrase(line: string) {
  if (!line || SOFT_SKILL_LINE_HINTS.test(line)) {
    return null;
  }

  const cleanedLine = cleanJobTitleCandidate(line);
  const match = cleanedLine.match(ROLE_PHRASE_PATTERN);
  if (!match?.[1]) {
    return null;
  }

  const title = cleanJobTitleCandidate(match[1])
    .replace(/\bfullstack\b/i, "Full Stack")
    .replace(/\bfull stack\b/i, "Full Stack")
    .replace(/\bbackend\b/i, "Backend")
    .replace(/\bfrontend\b/i, "Frontend")
    .replace(/\bsoftware\b/i, "Software")
    .replace(/\bdeveloper\b/i, "Developer")
    .replace(/\bengineer\b/i, "Engineer")
    .replace(/\bintern\b/i, "Intern");

  return title;
}

function inferRoleFallback(jobDescription: string) {
  const normalizedText = jobDescription.toLowerCase();
  if (/\b(?:java|spring|backend|sql|orm|c#|api)\b/.test(normalizedText)) {
    return "Backend Developer";
  }
  if (/\b(?:react|css|html|frontend)\b/.test(normalizedText)) {
    return "Frontend Developer";
  }
  return "Software Developer";
}

function inferJobTitle(jobDescription: string) {
  const lines = jobDescription
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 5)) {
    const title = extractRolePhrase(line);
    if (title) {
      return title;
    }
  }

  for (const line of lines) {
    const labelMatch = line.match(/^(?:role|position|job title)\s*:\s*(.+)$/i);
    if (labelMatch?.[1]) {
      const title = extractRolePhrase(labelMatch[1]);
      if (title) {
        return title;
      }
    }
  }

  const sectionStartIndex = lines.findIndex((line) => /\b(?:required skills|requirements|responsibilities)\b/i.test(line));
  if (sectionStartIndex >= 0) {
    const sectionLines = lines.slice(sectionStartIndex + 1, sectionStartIndex + 6);
    for (const line of sectionLines) {
      const title = extractRolePhrase(line);
      if (title) {
        return title;
      }
    }
  }

  return inferRoleFallback(jobDescription);
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyJwt(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { resumeId, jobDescription } = body;

    if (!resumeId || typeof resumeId !== "string") {
      return NextResponse.json({ error: "resumeId is required" }, { status: 400 });
    }
    if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    const jdValidation = validateJobDescription(jobDescription);
    if (!jdValidation.isValid) {
      return NextResponse.json(
        {
          error: jdValidation.warning || "Invalid Job Description detected",
          reasons: jdValidation.reasons,
        },
        { status: 400 }
      );
    }

    await connectDb();
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (resume.userId.toString() !== payload.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!resume.extractedText || !resume.extractedText.trim()) {
      return NextResponse.json({ error: "Resume contains no analyzable text." }, { status: 400 });
    }

    const analysisResult = analyzeResume(resume.extractedText, jobDescription);

    if (
      analysisResult.extractedData.jdSkills.length === 0 &&
      analysisResult.extractedData.jdKeywords.length === 0
    ) {
      return NextResponse.json(
        { error: "No recognizable skills or keywords were found in the job description." },
        { status: 400 }
      );
    }

    const jobTitle = inferJobTitle(jobDescription);

    const analysis = await Analysis.create({
      userId: payload.userId,
      resumeId,
      jobDescription,
      jobTitle,
      score: analysisResult.score,
      matchedSkills: analysisResult.matchedSkills,
      missingSkills: analysisResult.missingSkills,
      recommendedSkills: analysisResult.recommendedSkills,
      suggestions: analysisResult.suggestions,
      matchedKeywords: analysisResult.matchedKeywords,
      missingKeywords: analysisResult.missingKeywords,
      scoreBreakdown: analysisResult.scoreBreakdown,
      feedback: analysisResult.feedback,
      confidenceScore: analysisResult.confidenceScore,
      jdValidation: analysisResult.jdValidation,
      skillCategories: analysisResult.skillCategories,
      extractedData: analysisResult.extractedData,
    });

    return NextResponse.json({
      analysisId: analysis._id.toString(),
      jobTitle,
      score: analysisResult.score,
      matchedSkills: analysisResult.matchedSkills,
      missingSkills: analysisResult.missingSkills,
      recommendedSkills: analysisResult.recommendedSkills,
      suggestions: analysisResult.suggestions,
      matchedKeywords: analysisResult.matchedKeywords,
      missingKeywords: analysisResult.missingKeywords,
      scoreBreakdown: analysisResult.scoreBreakdown,
      feedback: analysisResult.feedback,
      confidenceScore: analysisResult.confidenceScore,
      jdValidation: analysisResult.jdValidation,
      skillCategories: analysisResult.skillCategories,
      extractedData: analysisResult.extractedData,
    });
  } catch (error) {
    console.error("ANALYZE_ERROR", error);
    const message = error instanceof Error ? error.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
