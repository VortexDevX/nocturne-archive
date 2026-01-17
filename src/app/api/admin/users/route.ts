import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import UserModel from "@/lib/db/models/User";
import type { ApiResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin access required" } as ApiResponse,
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const filter = q
      ? {
          $or: [
            { username: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const total = await UserModel.countDocuments(filter);
    const users = await UserModel.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json(
      {
        success: true,
        data: { users, page, limit, total },
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Admin users list error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch users",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin access required" } as ApiResponse,
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, canUpload, isAdmin } = body as {
      userId: string;
      canUpload?: boolean;
      isAdmin?: boolean;
    };

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "userId is required" } as ApiResponse,
        { status: 400 }
      );
    }

    await connectDB();

    // Prevent self-demotion to avoid lockout
    if (
      typeof isAdmin === "boolean" &&
      userId === session.userId &&
      isAdmin === false
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot remove your own admin role",
        } as ApiResponse,
        { status: 400 }
      );
    }

    const update: any = {};
    if (typeof canUpload === "boolean") update.canUpload = canUpload;
    if (typeof isAdmin === "boolean") update.isAdmin = isAdmin;

    const updated = await UserModel.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
      select: "-password",
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "User not found" } as ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updated,
        message: "User permissions updated",
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Admin users update error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update user",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}
