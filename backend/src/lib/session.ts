import { SignJWT, jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "milky-mushrooms-super-secret-key-15803d-green"
);

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function generateAccessToken(payload: SessionPayload) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m") // Short lived
    .sign(SECRET_KEY);
}

export async function generateRefreshToken(payload: SessionPayload) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Long lived
    .sign(SECRET_KEY);
}

export async function decryptSession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null;
  }
}

export interface SupabaseTokenPayload {
  sub: string;
  email: string;
  role: string;
  user_metadata?: {
    name?: string;
  };
}

export async function verifySupabaseToken(token: string): Promise<SupabaseTokenPayload | null> {
  try {
    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      return null;
    }
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SupabaseTokenPayload;
  } catch (error) {
    return null;
  }
}
