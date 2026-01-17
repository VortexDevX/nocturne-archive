import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import UserModel from "@/lib/db/models/User";
import { comparePassword } from "@/lib/auth/password";
import { signToken, getUserFromToken } from "@/lib/auth/jwt";
import type { AuthResponse, LoginFormData } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: LoginFormData = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required",
        } as AuthResponse,
        { status: 400 }
      );
    }

    await connectDB();

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        } as AuthResponse,
        { status: 401 }
      );
    }

    const isPasswordValid = await comparePassword(password, user.password!);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password",
        } as AuthResponse,
        { status: 401 }
      );
    }

    const userObject = user.toObject();
    const userPayload = {
      _id: userObject._id.toString(),
      username: userObject.username,
      email: userObject.email,
      profilePicture: userObject.profilePicture,
      createdAt: userObject.createdAt,
      updatedAt: userObject.updatedAt,
      canUpload: !!userObject.canUpload, // NEW
      isAdmin: !!userObject.isAdmin, // NEW
    };

    const token = await signToken(getUserFromToken(userPayload as any));

    const response = NextResponse.json(
      {
        success: true,
        user: userPayload,
        token,
        message: "Login successful",
      } as AuthResponse,
      { status: 200 }
    );

    response.cookies.set("nocturne-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      } as AuthResponse,
      { status: 500 }
    );
  }
}
