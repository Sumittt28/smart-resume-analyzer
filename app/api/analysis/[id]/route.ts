import { NextResponse } from "next/server";
import { verifyJwt, getTokenFromRequest } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import Analysis from "@/models/Analysis";

export async function GET(req: Request, context: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = verifyJwt(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const params = await context.params;
    const { id } = params;
    await connectDb();
    const analysis = await Analysis.findById(id).lean();
    if (!analysis) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (analysis.userId.toString() !== payload.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("ANALYSIS_DETAIL_ERROR", error);
    return NextResponse.json({ error: "Could not fetch analysis." }, { status: 500 });
  }
}
