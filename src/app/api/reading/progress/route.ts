import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import ReadingProgressModel from "@/lib/db/models/ReadingProgress";

// Save/Update reading progress
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { novelId, chapterNumber, position } = body;

    if (!novelId || !chapterNumber) {
      return NextResponse.json(
        { success: false, error: "Missing novelId or chapterNumber" },
        { status: 400 }
      );
    }

    await connectDB();

    // Use findOneAndUpdate with upsert for atomic operation
    const progress = await ReadingProgressModel.findOneAndUpdate(
      {
        userId: user.userId,
        novelId,
      },
      {
        $set: {
          currentChapter: chapterNumber,
          currentPosition: position || 0,
          lastReadAt: new Date(),
        },
        $addToSet: {
          // $addToSet only adds if not already in array (prevents duplicates)
          chaptersRead: chapterNumber,
        },
        $setOnInsert: {
          // Only set these fields if creating new document
          userId: user.userId,
          novelId,
          isCompleted: false,
        },
      },
      {
        new: true, // Return updated document
        upsert: true, // Create if doesn't exist
        runValidators: true,
      }
    );

    return NextResponse.json({
      success: true,
      data: progress,
      message: "Progress saved",
    });
  } catch (error) {
    console.error("Error saving reading progress:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save progress" },
      { status: 500 }
    );
  }
}

// Get reading progress for a specific novel
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: "Missing novelId" },
        { status: 400 }
      );
    }

    await connectDB();

    const progress = await ReadingProgressModel.findOne({
      userId: user.userId,
      novelId,
    }).lean();

    if (!progress) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...progress,
        _id: progress._id.toString(),
        chaptersRead: progress.chaptersRead || [],
      },
    });
  } catch (error) {
    console.error("Error fetching reading progress:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}
