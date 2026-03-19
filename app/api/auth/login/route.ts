import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { connectDb } from "@/lib/db";
import User from "@/models/User";
import { signJwt } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { email, password } = data;
    const fieldErrors: Record<string, string> = {};

    if (!email || typeof email !== "string" || !email.trim()) {
      fieldErrors.email = "Email is required.";
    }
    if (!password || typeof password !== "string") {
      fieldErrors.password = "Password is required.";
    }
    if (email && typeof email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      fieldErrors.email = "Enter a valid email address.";
    }
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: "Please fix the highlighted fields.", fieldErrors }, { status: 400 });
    }

    await connectDb();
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials.", fieldErrors: { email: "Invalid email or password." } }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials.", fieldErrors: { password: "Invalid email or password." } }, { status: 401 });
    }

    const token = signJwt({ userId: user._id.toString() });
    const response = NextResponse.json({ user: { id: user._id.toString(), email: user.email } }, { status: 200 });
    response.cookies.set("token", token, { httpOnly: true, path: "/", maxAge: 7 * 24 * 60 * 60, sameSite: "lax" });
    return response;
  } catch (error) {
    console.error("LOGIN_ERROR", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
