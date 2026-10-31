import { usesR2 } from "@/lib/storage/config";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import UserModel from "@/lib/db/models/User";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import type { ApiResponse } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    if (usesR2()) return NextResponse.json({ success: false, message: "Use direct avatar upload" }, { status: 409 });
    const formData = await request.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No file provided" } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "File must be an image" } as ApiResponse,
        { status: 400 }
      );
    }

    // Validate file size (3MB max)
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          message: "File size must be less than 3MB",
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), "data", "uploads", "avatars");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename with validated extension
    const ext = path.extname(file.name).toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid avatar format. Allowed formats: jpg, jpeg, png, webp",
        } as ApiResponse,
        { status: 400 }
      );
    }
    const filename = `${session.userId}-${Date.now()}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Update user in database
    await connectDB();
    const user = await UserModel.findByIdAndUpdate(
      session.userId,
      { profilePicture: `/api/user/avatar/${filename}` },
      { new: true }
    ).select("-password");

    return NextResponse.json(
      {
        success: true,
        data: { user, avatarUrl: `/api/user/avatar/${filename}` },
        message: "Avatar updated successfully",
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to upload avatar",
        error: error instanceof Error ? error.message : "Internal Server Error",
      } as ApiResponse,
      { status: 500 }
    );
  }
}
