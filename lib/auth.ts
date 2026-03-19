import jwt from "jsonwebtoken";

const JWT_EXPIRES_IN = "7d";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing JWT_SECRET environment variable in production.");
  }

  return "resume-secret-key";
}

export function signJwt(payload: { userId: string }) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: string; iat: number; exp: number };
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
