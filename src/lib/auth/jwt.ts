import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { User } from "@/types";

function getJwtSecret(): Uint8Array {
  const rawSecret = process.env.JWT_SECRET;
  if (!rawSecret) {
    throw new Error("FATAL: JWT_SECRET environment variable is not defined");
  }
  return new TextEncoder().encode(rawSecret);
}

export interface CustomJWTPayload {
  userId: string;
  email: string;
  username: string;
  isAdmin?: boolean;
  canUpload?: boolean;
  [key: string]: unknown;
}

export async function signToken(payload: CustomJWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyToken(
  token: string
): Promise<CustomJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

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
    isAdmin: Boolean((user as Record<string, unknown>).isAdmin),
    canUpload: Boolean((user as Record<string, unknown>).canUpload),
  };
}
