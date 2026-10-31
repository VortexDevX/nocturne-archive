import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import UserLibraryModel from "@/lib/db/models/UserLibrary";
import NovelModel from "@/lib/db/models/Novel";
import ReadingProgressModel from "@/lib/db/models/ReadingProgress";
import {
  readNovelMetadata,
  readChaptersMetadata,
} from "@/lib/utils/fileSystem";

const SHELVES = ["plan_to_read", "reading", "completed", "dropped"];

interface NovelData {
  slug: string;
  title: string;
  author: string;
  coverImage?: string;
  genres: string[];
  status: string;
  totalChapters: number;
}

// GET - Get user's library
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
    const status = searchParams.get("status");
    const favorites = searchParams.get("favorites");

    await connectDB();

    const query: Record<string, unknown> = { userId: user.userId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (favorites === "true") {
      query.isFavorite = true;
    }

    const libraryItems = await UserLibraryModel.find(query)
      .sort({ addedAt: -1 })
      .lean();

    const novelIds = libraryItems.map((item) => item.novelId);
    const [novels, progresses] = await Promise.all([
      NovelModel.find({ slug: { $in: novelIds } })
        .select("slug title author coverImage genres status totalChapters")
        .lean(),
      ReadingProgressModel.find({
        userId: user.userId,
        novelId: { $in: novelIds },
      })
        .select(
          "novelId currentChapter currentPosition currentScrollPosition progressPercent lastReadAt",
        )
        .lean(),
    ]);
    const novelMap = new Map(novels.map((novel) => [novel.slug, novel]));
    const progressMap = new Map(
      progresses.map((progress) => [progress.novelId, progress]),
    );

    // Batch relational metadata; retain filesystem fallback for older imports.
    const libraryWithNovels = await Promise.all(
      libraryItems.map(async (item) => {
        let novelData: NovelData | null = null;

        // Try MongoDB first
        const novelFromDB = novelMap.get(item.novelId);

        if (novelFromDB) {
          novelData = {
            slug: novelFromDB.slug || item.novelId,
            title: novelFromDB.title,
            author: novelFromDB.author,
            coverImage: novelFromDB.coverImage,
            genres: novelFromDB.genres || [],
            status: novelFromDB.status || "ongoing",
            totalChapters: novelFromDB.totalChapters || 0,
          };
        } else {
          // Fallback to metadata.json if not in DB

          try {
            const metadata = await readNovelMetadata(item.novelId);
            if (!metadata) return null;
            const chapters = await readChaptersMetadata(item.novelId);
            const totalChapters =
              chapters.length || metadata.totalChapters || 0;

            novelData = {
              slug: item.novelId,
              title: metadata.title,
              author: metadata.author,
              coverImage: metadata.coverImage
                ? `/api/novels/cover/${item.novelId}/${metadata.coverImage}`
                : undefined,
              genres: metadata.genres || [],
              status: metadata.status || "ongoing",
              totalChapters,
            };
          } catch (error) {
            console.error(
              `Failed to load metadata for ${item.novelId}:`,
              error,
            );
            return null;
          }
        }

        if (!novelData) {
          return null;
        }

        return {
          ...item,
          _id: item._id.toString(),
          novel: novelData,
          currentChapter: progressMap.get(item.novelId)?.currentChapter || 1,
          currentScrollPosition:
            progressMap.get(item.novelId)?.currentScrollPosition ??
            progressMap.get(item.novelId)?.currentPosition ??
            0,
          progressPercent:
            progressMap.get(item.novelId)?.progressPercent ??
            Math.min(
              100,
              Math.floor(
                (Math.max(
                  0,
                  (progressMap.get(item.novelId)?.currentChapter || 1) - 1,
                ) /
                  Math.max(1, novelData.totalChapters)) *
                  100,
              ),
            ),
          lastReadAt:
            progressMap.get(item.novelId)?.lastReadAt || item.lastReadAt,
        };
      }),
    );

    const validLibrary = libraryWithNovels.filter((item) => item !== null);

    return NextResponse.json({
      success: true,
      data: validLibrary,
      count: validLibrary.length,
    });
  } catch (error) {
    console.error("Error fetching library:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch library" },
      { status: 500 },
    );
  }
}

// POST - Add novel to library
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { novelId, status = "plan_to_read" } = body;

    if (typeof novelId !== "string" || !novelId) {
      return NextResponse.json(
        { success: false, error: "Novel ID required" },
        { status: 400 },
      );
    }

    if (!SHELVES.includes(status)) return NextResponse.json({ success: false, error: "Invalid shelf" }, { status: 400 });
    await connectDB();

    // Check if already in library
    const existing = await UserLibraryModel.findOne({
      userId: user.userId,
      novelId,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Already in library", alreadyExists: true },
        { status: 400 },
      );
    }

    // Add to library
    const libraryItem = await UserLibraryModel.create({
      userId: user.userId,
      novelId,
      status,
      isFavorite: false,
      addedAt: new Date(),
      lastStatusChange: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: libraryItem,
      message: "Added to library",
    });
  } catch (error) {
    console.error("Error adding to library:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add to library" },
      { status: 500 },
    );
  }
}

// PATCH - Update library item (status or favorite)
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { novelId, status, isFavorite, rating } = body;

    if (typeof novelId !== "string" || !novelId) {
      return NextResponse.json(
        { success: false, error: "Novel ID required" },
        { status: 400 },
      );
    }

    await connectDB();

    if ((status !== undefined && !SHELVES.includes(status)) ||
      (isFavorite !== undefined && typeof isFavorite !== "boolean") ||
      (rating !== undefined && (!Number.isInteger(rating) || rating < 1 || rating > 5))) {
      return NextResponse.json({ success: false, error: "Invalid library update" }, { status: 400 });
    }
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      updateData.status = status;
      updateData.lastStatusChange = new Date();
    }
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (rating !== undefined) updateData.rating = rating;

    const libraryItem = await UserLibraryModel.findOneAndUpdate(
      { userId: user.userId, novelId },
      updateData,
      { new: true, runValidators: true },
    );

    if (!libraryItem) {
      return NextResponse.json(
        { success: false, error: "Not in library" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: libraryItem,
      message: "Library updated",
    });
  } catch (error) {
    console.error("Error updating library:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update library" },
      { status: 500 },
    );
  }
}

// DELETE - Remove from library
export async function DELETE(request: NextRequest) {
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

    if (typeof novelId !== "string" || !novelId) {
      return NextResponse.json(
        { success: false, error: "Novel ID required" },
        { status: 400 },
      );
    }

    await connectDB();

    await UserLibraryModel.findOneAndDelete({
      userId: user.userId,
      novelId,
    });

    return NextResponse.json({
      success: true,
      message: "Removed from library",
    });
  } catch (error) {
    console.error("Error removing from library:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove from library" },
      { status: 500 },
    );
  }
}
