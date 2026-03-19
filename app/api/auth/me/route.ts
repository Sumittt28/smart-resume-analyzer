import { NextResponse } from "next/server";
import { verifyJwt, getTokenFromRequest } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const payload = verifyJwt(token);
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    await connectDb();
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user: { id: user._id.toString(), email: user.email } });
  } catch (error) {
    console.error("ME_ERROR", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
