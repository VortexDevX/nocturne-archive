import { cookies } from "next/headers";
import { verifyToken, CustomJWTPayload } from "./jwt";
import { NextRequest } from "next/server";

const TOKEN_NAME = "nocturne-token";

export async function getSession(): Promise<CustomJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;

  if (!token) {
    return null;
  }

  return await verifyToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

// NEW: Helper for API routes that need authentication
export async function verifyAuth(
  request: NextRequest
): Promise<CustomJWTPayload | null> {
  const token = request.cookies.get(TOKEN_NAME)?.value;

  if (!token) {
    return null;
  }

  return await verifyToken(token);
}
