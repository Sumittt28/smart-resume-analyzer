import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "resume-secret-key";
const JWT_EXPIRES_IN = "7d";

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable");
}

export function signJwt(payload: { userId: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; iat: number; exp: number };
  } catch {
    return null;
  }
}

export function buildJwtCookie(token: string) {
  const cookieValue = `token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  return cookieValue;
}

export function getTokenFromRequest(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .map((item) => {
      const [key, ...rest] = item.split("=");
      return { key, value: rest.join("=") };
    })
    .reduce<Record<string, string>>((acc, c) => {
      if (c.key) acc[c.key] = c.value;
      return acc;
    }, {});
  return cookies["token"] || null;
}
