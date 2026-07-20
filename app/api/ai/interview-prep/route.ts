import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { verifyJwt, getTokenFromRequest } from "@/lib/auth";
import { predictInterviewQuestions } from "@/lib/gemini";
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

    const questions = await predictInterviewQuestions(
      analysis.jobDescription,
      analysis.missingSkills || [],
      analysis.matchedSkills || []
    );

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("AI_INTERVIEW_PREP_ERROR", error);
    const message = error instanceof Error ? error.message : "Failed to generate interview questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
