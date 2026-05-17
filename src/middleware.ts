import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

const protectedRoutes = [
  "/library",
  "/profile",
  "/reader",
  "/novel",
  "/explore",
  "/continue",
  "/bookmarks",
  "/settings",
  "/admin",
];
const authRoutes = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("nocturne-token")?.value;
  const session = token ? await verifyToken(token) : null;

  // Redirect old upload path to admin
  if (pathname.startsWith("/library/upload")) {
    return NextResponse.redirect(new URL("/admin/upload", request.url));
  }

  // Admin gating
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const isUsersRoute = pathname.startsWith("/admin/users");
    const isUploadRoute = pathname.startsWith("/admin/upload");
    const isDev = process.env.NODE_ENV === "development";

    if (isUsersRoute) {
      // Only admins can manage users (allow in dev)
      if (!session.isAdmin && !isDev) {
        return NextResponse.redirect(new URL("/library", request.url));
      }
    } else if (isUploadRoute) {
      // Admins or canUpload users can access upload (allow all in dev)
      if (!(session.isAdmin || session.canUpload) && !isDev) {
        return NextResponse.redirect(new URL("/library", request.url));
      }
    } else {
      // Default: admin-only for other /admin routes (allow in dev)
      if (!session.isAdmin && !isDev) {
        return NextResponse.redirect(new URL("/library", request.url));
      }
    }
  }

  // Auth-protected routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Prevent accessing auth pages while logged in
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (session) {
      return NextResponse.redirect(new URL("/library", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|uploads|icon-|data).*)",
  ],
};
