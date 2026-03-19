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
    } else if (password.length < 6) {
      fieldErrors.password = "Password must be at least 6 characters.";
    }
    if (email && typeof email === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      fieldErrors.email = "Enter a valid email address.";
    }
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: "Please fix the highlighted fields.", fieldErrors }, { status: 400 });
    }

    await connectDb();
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered", fieldErrors: { email: "Email already registered" } },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email: email.toLowerCase().trim(), password: hashed });
    const token = signJwt({ userId: user._id.toString() });

    const response = NextResponse.json({ user: { id: user._id.toString(), email: user.email } }, { status: 201 });
    response.cookies.set("token", token, { httpOnly: true, path: "/", maxAge: 7 * 24 * 60 * 60, sameSite: "lax" });
    return response;
  } catch (error) {
    console.error("REGISTER_ERROR", error);
    if ((error as { code?: number })?.code === 11000) {
      return NextResponse.json(
        { error: "Email already registered", fieldErrors: { email: "Email already registered" } },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
