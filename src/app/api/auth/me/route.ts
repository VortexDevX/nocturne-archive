import { NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import UserModel from "@/lib/db/models/User";
import { getSession } from "@/lib/auth/session";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        } as ApiResponse,
        { status: 401 }
      );
    }

    await connectDB();

    const user = await UserModel.findById(session.userId).select("-password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        } as ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: user,
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Get user error:", error);
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
