import { NextResponse } from "next/server";
import { verifyJwt, getTokenFromRequest } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import Resume from "@/models/Resume";
import Analysis from "@/models/Analysis";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyJwt(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDb();
    const resumes = await Resume.find({ userId: payload.userId }).lean();
    const analyses = await Analysis.find({ userId: payload.userId }).lean();

    const history = resumes
      .map((r) => {
        const found = analyses.filter((a) => a.resumeId.toString() === r._id.toString());
        const latest = found.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
        return {
          id: r._id.toString(),
          fileName: r.fileName,
          createdAt: r.createdAt,
          jobTitle: latest?.jobTitle ?? null,
          score: latest?.score ?? null,
          analysisId: latest?._id.toString() ?? null,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({ history });
  } catch (error) {
    console.error("DASHBOARD_ERROR", error);
    return NextResponse.json({ error: "Could not load dashboard." }, { status: 500 });
  }
}
