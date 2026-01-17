import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import UserModel from "@/lib/db/models/User";
import UserPreferencesModel from "@/lib/db/models/UserPreferences";
import { hashPassword } from "@/lib/auth/password";
import { signToken, getUserFromToken } from "@/lib/auth/jwt";
import { validateEmail, validateUsername } from "@/lib/utils/validators";
import { validatePassword } from "@/lib/auth/password";
import type { AuthResponse, RegisterFormData } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body: RegisterFormData = await req.json();
    const { username, email, password, confirmPassword } = body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "All fields are required",
        } as AuthResponse,
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Passwords do not match",
        } as AuthResponse,
        { status: 400 }
      );
    }

    // Validate email
    if (!validateEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email address",
        } as AuthResponse,
        { status: 400 }
      );
    }

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: usernameValidation.message,
        } as AuthResponse,
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          message: passwordValidation.message,
        } as AuthResponse,
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      const field =
        existingUser.email === email.toLowerCase() ? "Email" : "Username";
      return NextResponse.json(
        {
          success: false,
          message: `${field} already exists`,
        } as AuthResponse,
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await UserModel.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      // isAdmin and canUpload will default to false from schema
    });

    await UserPreferencesModel.create({
      userId: user._id.toString(),
    });

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
        message: "Account created successfully",
      } as AuthResponse,
      { status: 201 }
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
    console.error("Register error:", error);
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
