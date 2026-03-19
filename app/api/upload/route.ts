import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { connectDb } from "@/lib/db";
import { verifyJwt, getTokenFromRequest } from "@/lib/auth";
import Resume from "@/models/Resume";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = verifyJwt(token);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const maybeFile = formData.get("file");
    if (!(maybeFile instanceof File)) {
      return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
    }

    const namedFile = maybeFile;
    const fileName = typeof namedFile.name === "string" ? namedFile.name : "resume.pdf";
    const fileType = typeof namedFile.type === "string" && namedFile.type ? namedFile.type : "application/pdf";
    const isPdfType = fileType === "application/pdf" || fileName.toLowerCase().endsWith('.pdf');
    if (!isPdfType) {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }

    const size = typeof namedFile.size === "number" ? namedFile.size : (await namedFile.arrayBuffer()).byteLength;
    if (size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 10MB." }, { status: 400 });
    }

    const arrayBuffer = await namedFile.arrayBuffer();
    let text = "";
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: Buffer.from(arrayBuffer) });
      const parsed = await parser.getText();
      text = parsed.text.trim();
    } catch (err) {
      console.warn("PDF text extraction failed", err);
    } finally {
      if (parser) {
        await parser.destroy().catch((destroyError) => {
          console.warn("PDF parser cleanup failed", destroyError);
        });
      }
    }

    if (!text) {
      return NextResponse.json(
        { error: "Could not extract text from this PDF. Please upload a text-based PDF." },
        { status: 400 }
      );
    }

    await connectDb();
    const resume = await Resume.create({
      userId: payload.userId,
      fileName,
      extractedText: text,
    });

    return NextResponse.json({ resumeId: resume._id.toString(), fileName: resume.fileName, extractedText: text.slice(0, 240) });
  } catch (error) {
    console.error("UPLOAD_ERROR", error);
    const message = error instanceof Error ? error.message : "Could not upload resume.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
