import { SignJWT, jwtVerify } from "jose";
import { User } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-key-change-in-production"
);

export interface CustomJWTPayload {
  userId: string;
  email: string;
  username: string;
  isAdmin?: boolean; // NEW
  canUpload?: boolean; // NEW
  [key: string]: any;
}

export async function signToken(payload: CustomJWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<CustomJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (
      payload &&
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.username === "string"
    ) {
      return payload as CustomJWTPayload;
    }

    return null;
  } catch {
    return null;
  }
}

export function getUserFromToken(user: Partial<User>): CustomJWTPayload {
  const userId = String(user._id);

  return {
    userId,
    email: user.email!,
    username: user.username!,
    isAdmin: Boolean((user as any).isAdmin),
    canUpload: Boolean((user as any).canUpload),
  };
}
