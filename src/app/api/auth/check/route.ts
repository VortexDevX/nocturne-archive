import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("nocturne-token")?.value;

  if (!token) {
    return NextResponse.json({
      authenticated: false,
    });
  }

  const session = await verifyToken(token);

  if (!session) {
    return NextResponse.json({
      authenticated: false,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: session.userId,
      email: session.email,
      username: session.username,
      isAdmin: Boolean(session.isAdmin),
      canUpload: Boolean(session.canUpload),
    },
  });
}
