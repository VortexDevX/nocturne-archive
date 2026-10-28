import { NextResponse } from "next/server";
import { deleteSessionCookie } from "@/lib/auth/session";
import type { ApiResponse } from "@/types";

export async function POST() {
  try {
    await deleteSessionCookie();

    return NextResponse.json(
      {
        success: true,
        message: "Logged out successfully",
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Logout error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse,
      { status: 500 }
    );
  }
}
