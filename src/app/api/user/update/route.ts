import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import UserModel from "@/lib/db/models/User";
import { hashPassword, comparePassword } from "@/lib/auth/password";
import type { ApiResponse } from "@/types";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    const body = await request.json();
    const { field, value, currentPassword } = body;

    await connectDB();
    const user = await UserModel.findById(session.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" } as ApiResponse,
        { status: 404 }
      );
    }

    // Ensure password exists
    if (!user.password) {
      return NextResponse.json(
        { success: false, message: "User password not found" } as ApiResponse,
        { status: 500 }
      );
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Current password is incorrect",
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Update based on field
    switch (field) {
      case "username":
        // Check if username already exists
        const existingUser = await UserModel.findOne({ username: value });
        if (existingUser && existingUser._id.toString() !== session.userId) {
          return NextResponse.json(
            {
              success: false,
              message: "Username already taken",
            } as ApiResponse,
            { status: 400 }
          );
        }
        user.username = value;
        break;

      case "email":
        // Check if email already exists
        const existingEmail = await UserModel.findOne({ email: value });
        if (existingEmail && existingEmail._id.toString() !== session.userId) {
          return NextResponse.json(
            { success: false, message: "Email already in use" } as ApiResponse,
            { status: 400 }
          );
        }
        user.email = value;
        break;

      case "password":
        user.password = await hashPassword(value);
        break;

      default:
        return NextResponse.json(
          { success: false, message: "Invalid field" } as ApiResponse,
          { status: 400 }
        );
    }

    await user.save();

    const updatedUser = await UserModel.findById(session.userId).select(
      "-password"
    );

    return NextResponse.json(
      {
        success: true,
        data: updatedUser,
        message: `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } updated successfully`,
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update user error:", error);
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
