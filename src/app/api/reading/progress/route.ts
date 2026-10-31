import { readableNovelFilter } from "@/lib/storage/config";
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import ReadingProgressModel from "@/lib/db/models/ReadingProgress";
import NovelModel from "@/lib/db/models/Novel";
import {
  readNovelMetadata,
  readChaptersMetadata,
} from "@/lib/utils/fileSystem";

// Save/Update reading progress
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid reading position" },
        { status: 400 },
      );
    }
    const { novelId, chapterNumber, position = 0, chapterProgress } = body;

    if (
      typeof novelId !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(novelId) ||
      !Number.isSafeInteger(chapterNumber) ||
      chapterNumber < 1 ||
      !Number.isFinite(position) ||
      position < 0 ||
      (chapterProgress !== undefined &&
        (!Number.isFinite(chapterProgress) ||
          chapterProgress < 0 ||
          chapterProgress > 1))
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid reading position" },
        { status: 400 },
      );
    }

    await connectDB();

    const novel = await NovelModel.findOne({ slug: novelId, ...readableNovelFilter() })
      .select("totalChapters")
      .lean();
    let totalChapters = novel?.totalChapters || 0;
    let chapterIndex = chapterNumber - 1;
    if (!totalChapters) {
      const [metadata, chapters] = await Promise.all([
        readNovelMetadata(novelId),
        readChaptersMetadata(novelId),
      ]);
      totalChapters = chapters.length || metadata?.totalChapters || 0;
      if (chapters.length)
        chapterIndex = chapters.findIndex(
          (chapter) => chapter.number === chapterNumber,
        );
    }
    if (!totalChapters || chapterIndex < 0 || chapterIndex >= totalChapters) {
      return NextResponse.json(
        { success: false, error: "Chapter not found" },
        { status: 404 },
      );
    }
    const progressFields =
      chapterProgress === undefined || !totalChapters
        ? {}
        : {
            chapterProgress,
            progressPercent: Math.min(
              100,
              ((chapterIndex + chapterProgress) / totalChapters) * 100,
            ),
          };

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
          currentScrollPosition: position,
          ...progressFields,
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
      },
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
      { status: 500 },
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
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: "Missing novelId" },
        { status: 400 },
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
      { status: 500 },
    );
  }
}
