import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import UserPreferencesModel from "@/lib/db/models/UserPreferences";
import type { ApiResponse } from "@/types";

const ALLOWED_FIELDS = new Set([
  "theme",
  "accentColor",
  "fontSize",
  "fontFamily",
  "lineHeight",
  "brightness",
  "autoSave",
  "offlineMode",
  "ttsEnabled",
  "ttsVoice",
  "ttsSpeed",
]);

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    await connectDB();

    let prefs = await UserPreferencesModel.findOne({ userId: session.userId });
    if (!prefs) {
      // create defaults
      prefs = await UserPreferencesModel.create({ userId: session.userId });
    }

    return NextResponse.json({ success: true, data: prefs } as ApiResponse, {
      status: 200,
    });
  } catch (error: any) {
    console.error("Preferences GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load preferences",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    const body = await request.json();
    const update: Record<string, any> = {};

    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        update[key] = body[key];
      }
    }

    await connectDB();

    const prefs = await UserPreferencesModel.findOneAndUpdate(
      { userId: session.userId },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json(
      {
        success: true,
        data: prefs,
        message: "Preferences updated",
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Preferences PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update preferences",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}
