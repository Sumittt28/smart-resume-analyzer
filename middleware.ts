import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/result"];
const authPaths = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;

  const isProtectedPath = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isAuthPath = authPaths.includes(pathname);

  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthPath && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/result/:path*", "/login", "/register"],
};
