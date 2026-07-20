import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { verifyJwt, getTokenFromRequest } from "@/lib/auth";
import { generateCoverLetter } from "@/lib/gemini";
import Resume from "@/models/Resume";
import Analysis from "@/models/Analysis";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyJwt(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { analysisId } = await req.json();
    if (!analysisId) {
      return NextResponse.json({ error: "analysisId is required" }, { status: 400 });
    }

    await connectDb();

    const analysis = await Analysis.findById(analysisId);
    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    if (analysis.userId.toString() !== payload.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const resume = await Resume.findById(analysis.resumeId);
    if (!resume || !resume.extractedText) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const coverLetter = await generateCoverLetter(
      resume.extractedText,
      analysis.jobDescription,
      analysis.matchedSkills || []
    );

    return NextResponse.json({ coverLetter });
  } catch (error) {
    console.error("AI_COVER_LETTER_ERROR", error);
    const message = error instanceof Error ? error.message : "Failed to generate cover letter";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
