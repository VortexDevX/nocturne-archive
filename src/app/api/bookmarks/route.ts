import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import BookmarkModel from "@/lib/db/models/Bookmark";
import NovelModel from "@/lib/db/models/Novel";

// GET - Fetch all bookmarks for user
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");
    const filter = searchParams.get("filter"); // "all", "notes", "quotes", "recent"

    let query: any = { userId: user.userId };

    if (novelId) {
      query.novelId = novelId;
    }

    // Apply filters
    if (filter === "notes") {
      query.note = { $exists: true, $ne: "" };
    } else if (filter === "quotes") {
      query.selectedText = { $exists: true, $ne: "" };
    }

    let bookmarks = await BookmarkModel.find(query)
      .sort({ createdAt: -1 })
      .limit(filter === "recent" ? 10 : 100)
      .lean();

    // Populate with novel details
    const bookmarksWithNovelData = await Promise.all(
      bookmarks.map(async (bookmark) => {
        let novelTitle = "Unknown";
        let novelAuthor = "Unknown";

        // First try database
        const novel = await NovelModel.findOne({ slug: bookmark.novelId })
          .select("title author")
          .lean();

        if (novel) {
          novelTitle = novel.title;
          novelAuthor = novel.author || "Unknown";
        } else {
          // Fallback to metadata file
          try {
            const fs = await import("fs").then((m) => m.promises);
            const path = await import("path");
            const metadataPath = path.join(
              process.cwd(),
              "data",
              "novels",
              bookmark.novelId,
              "metadata.json",
            );
            const metadataContent = await fs.readFile(metadataPath, "utf-8");
            const metadata = JSON.parse(metadataContent);
            novelTitle = metadata.title || "Unknown";
            novelAuthor = metadata.author || "Unknown";
          } catch {
            // If metadata file doesn't exist, keep Unknown
          }
        }

        return {
          ...bookmark,
          _id: bookmark._id.toString(),
          novelTitle,
          novelAuthor,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      data: bookmarksWithNovelData,
      count: bookmarksWithNovelData.length,
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookmarks" },
      { status: 500 },
    );
  }
}

// POST - Create new bookmark
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
    const {
      novelId,
      chapterNumber,
      chapterTitle,
      position,
      selectedText,
      note,
      tags,
      color,
    } = body;

    if (!novelId || !chapterNumber || !chapterTitle || position === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    await connectDB();

    const bookmark = await BookmarkModel.create({
      userId: user.userId,
      novelId,
      chapterNumber,
      chapterTitle,
      position,
      selectedText: selectedText || "",
      note: note || "",
      tags: tags || [],
      color: color || "yellow",
    });

    return NextResponse.json({
      success: true,
      data: bookmark,
      message: "Bookmark created successfully",
    });
  } catch (error) {
    console.error("Error creating bookmark:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create bookmark" },
      { status: 500 },
    );
  }
}

// DELETE - Delete bookmark
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
    const bookmarkId = searchParams.get("id");

    if (!bookmarkId) {
      return NextResponse.json(
        { success: false, error: "Bookmark ID required" },
        { status: 400 },
      );
    }

    await connectDB();

    const bookmark = await BookmarkModel.findOneAndDelete({
      _id: bookmarkId,
      userId: user.userId,
    });

    if (!bookmark) {
      return NextResponse.json(
        { success: false, error: "Bookmark not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bookmark deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete bookmark" },
      { status: 500 },
    );
  }
}

// PATCH - Update bookmark
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
    const { bookmarkId, note, tags, color } = body;

    if (!bookmarkId) {
      return NextResponse.json(
        { success: false, error: "Bookmark ID required" },
        { status: 400 },
      );
    }

    await connectDB();

    const updateData: any = {};
    if (note !== undefined) updateData.note = note;
    if (tags !== undefined) updateData.tags = tags;
    if (color !== undefined) updateData.color = color;

    const bookmark = await BookmarkModel.findOneAndUpdate(
      { _id: bookmarkId, userId: user.userId },
      updateData,
      { new: true },
    );

    if (!bookmark) {
      return NextResponse.json(
        { success: false, error: "Bookmark not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: bookmark,
      message: "Bookmark updated successfully",
    });
  } catch (error) {
    console.error("Error updating bookmark:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update bookmark" },
      { status: 500 },
    );
  }
}
