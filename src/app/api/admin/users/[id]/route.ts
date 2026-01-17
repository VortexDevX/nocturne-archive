import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import UserModel from "@/lib/db/models/User";
import { getSession } from "@/lib/auth/session";
import type { ApiResponse } from "@/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    await connectDB();
    const me = await UserModel.findById(session.userId).select("isAdmin");
    if (!me?.isAdmin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" } as ApiResponse,
        { status: 403 }
      );
    }

    const body = await request.json();
    const { canUpload, isAdmin } = body as {
      canUpload?: boolean;
      isAdmin?: boolean;
    };

    // Await the params
    const { id } = await params;

    const target = await UserModel.findById(id);
    if (!target) {
      return NextResponse.json(
        { success: false, message: "User not found" } as ApiResponse,
        { status: 404 }
      );
    }

    // Prevent removing last admin
    if (typeof isAdmin === "boolean" && target.isAdmin && isAdmin === false) {
      const adminsCount = await UserModel.countDocuments({ isAdmin: true });
      if (adminsCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            message: "Cannot remove the last admin",
          } as ApiResponse,
          { status: 400 }
        );
      }
    }

    if (typeof canUpload === "boolean") target.canUpload = canUpload;
    if (typeof isAdmin === "boolean") target.isAdmin = isAdmin;

    await target.save();
    const updated = await UserModel.findById(id).select("-password");

    return NextResponse.json(
      { success: true, data: updated, message: "User updated" } as ApiResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Admin update user error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}
