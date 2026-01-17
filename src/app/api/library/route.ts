import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import UserLibraryModel from "@/lib/db/models/UserLibrary";
import NovelModel from "@/lib/db/models/Novel";
import path from "path";
import fs from "fs/promises";

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
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const favorites = searchParams.get("favorites");

    await connectDB();

    let query: any = { userId: user.userId };

    if (status && status !== "all") {
      query.status = status;
    }

    if (favorites === "true") {
      query.isFavorite = true;
    }

    const libraryItems = await UserLibraryModel.find(query)
      .sort({ addedAt: -1 })
      .lean();

    console.log(`Found ${libraryItems.length} library items for user`);

    // Get novel details for each library item
    const libraryWithNovels = await Promise.all(
      libraryItems.map(async (item) => {
        console.log(`Fetching details for novel: ${item.novelId}`);

        let novelData: NovelData | null = null;

        // Try MongoDB first
        const novelFromDB = await NovelModel.findOne({ slug: item.novelId })
          .select("slug title author coverImage genres status totalChapters")
          .lean();

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
          console.log(`Loaded ${novelData.title} from MongoDB`);
        } else {
          // Fallback to metadata.json if not in DB
          console.log(
            `Novel ${item.novelId} not in DB, trying metadata file...`
          );
          try {
            const metadataPath = path.join(
              process.cwd(),
              "data",
              "novels",
              item.novelId,
              "metadata.json"
            );
            const metadataContent = await fs.readFile(metadataPath, "utf-8");
            const metadata = JSON.parse(metadataContent);

            // Try to get actual chapter count from chapters.json
            let totalChapters = metadata.totalChapters || 0;
            try {
              const chaptersJsonPath = path.join(
                process.cwd(),
                "data",
                "novels",
                item.novelId,
                "chapters.json"
              );
              const chaptersData = await fs.readFile(chaptersJsonPath, "utf-8");
              const chapters = JSON.parse(chaptersData);
              if (chapters.length > 0) {
                totalChapters = chapters.length;
              }
            } catch (err) {
              console.log(`Could not read chapters.json for ${item.novelId}`);
            }

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
            console.log(`Loaded ${novelData.title} from metadata`);
          } catch (error) {
            console.error(
              `Failed to load metadata for ${item.novelId}:`,
              error
            );
            return null;
          }
        }

        if (!novelData) {
          console.log(`Novel ${item.novelId} not found anywhere`);
          return null;
        }

        return {
          ...item,
          _id: item._id.toString(),
          novel: novelData,
        };
      })
    );

    const validLibrary = libraryWithNovels.filter((item) => item !== null);

    console.log(`Returning ${validLibrary.length} valid library items`);

    return NextResponse.json({
      success: true,
      data: validLibrary,
      count: validLibrary.length,
    });
  } catch (error) {
    console.error("Error fetching library:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch library" },
      { status: 500 }
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
        { status: 401 }
      );
    }

    const body = await request.json();
    const { novelId, status = "plan_to_read" } = body;

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: "Novel ID required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if already in library
    const existing = await UserLibraryModel.findOne({
      userId: user.userId,
      novelId,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Already in library", alreadyExists: true },
        { status: 400 }
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

    console.log(`Added ${novelId} to library with status: ${status}`);

    return NextResponse.json({
      success: true,
      data: libraryItem,
      message: "Added to library",
    });
  } catch (error) {
    console.error("Error adding to library:", error);
    return NextResponse.json(
      { success: false, error: "Failed to add to library" },
      { status: 500 }
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
        { status: 401 }
      );
    }

    const body = await request.json();
    const { novelId, status, isFavorite, rating } = body;

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: "Novel ID required" },
        { status: 400 }
      );
    }

    await connectDB();

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      updateData.lastStatusChange = new Date();
    }
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (rating !== undefined) updateData.rating = rating;

    const libraryItem = await UserLibraryModel.findOneAndUpdate(
      { userId: user.userId, novelId },
      updateData,
      { new: true }
    );

    if (!libraryItem) {
      return NextResponse.json(
        { success: false, error: "Not in library" },
        { status: 404 }
      );
    }

    console.log(`Updated ${novelId} in library`);

    return NextResponse.json({
      success: true,
      data: libraryItem,
      message: "Library updated",
    });
  } catch (error) {
    console.error("Error updating library:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update library" },
      { status: 500 }
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
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const novelId = searchParams.get("novelId");

    if (!novelId) {
      return NextResponse.json(
        { success: false, error: "Novel ID required" },
        { status: 400 }
      );
    }

    await connectDB();

    await UserLibraryModel.findOneAndDelete({
      userId: user.userId,
      novelId,
    });

    console.log(`Removed ${novelId} from library`);

    return NextResponse.json({
      success: true,
      message: "Removed from library",
    });
  } catch (error) {
    console.error("Error removing from library:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove from library" },
      { status: 500 }
    );
  }
}
