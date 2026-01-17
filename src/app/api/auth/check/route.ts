import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("nocturne-token")?.value;

  console.log("Cookie check:");
  console.log("- Token exists:", !!token);
  console.log("- All cookies:", request.cookies.getAll());

  if (!token) {
    return NextResponse.json({
      authenticated: false,
      message: "No token found",
      cookies: request.cookies.getAll(),
    });
  }

  const session = await verifyToken(token);

  return NextResponse.json({
    authenticated: !!session,
    session,
    token: token.substring(0, 20) + "...",
    cookies: request.cookies.getAll(),
  });
}
