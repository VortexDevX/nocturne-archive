import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import NovelModel from "@/lib/db/models/Novel";
import {
  getNovelFolders,
  readNovelMetadata,
  readChaptersMetadata,
  generateSlug,
} from "@/lib/utils/fileSystem";
import type { ApiResponse } from "@/types";

/**
 * GET /api/novels
 * List all novels (from database + file system)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    await connectDB();

    // Get novels from database
    const dbNovels = await NovelModel.find({ addedBy: session.userId });

    // Get novels from file system
    const novelFolders = await getNovelFolders();
    const fileSystemNovels = [];

    for (const folder of novelFolders) {
      const metadata = await readNovelMetadata(folder);
      const chapters = await readChaptersMetadata(folder);

      if (metadata) {
        // Check if novel exists in database
        const existsInDb = dbNovels.find(
          (novel) => novel.folderPath === `data/novels/${folder}`
        );

        if (!existsInDb) {
          fileSystemNovels.push({
            ...metadata,
            slug: folder,
            totalChapters: chapters.length,
            source: "filesystem",
          });
        }
      }
    }

    // Combine both sources
    const allNovels = [
      ...dbNovels.map((novel) => ({
        ...novel.toObject(),
        source: "database",
      })),
      ...fileSystemNovels,
    ];

    return NextResponse.json(
      {
        success: true,
        data: allNovels,
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Get novels error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get novels",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * POST /api/novels
 * Create a new novel
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, author, description, genres, status } = body;

    // Validate required fields
    if (!title || !author) {
      return NextResponse.json(
        {
          success: false,
          message: "Title and author are required",
        } as ApiResponse,
        { status: 400 }
      );
    }

    await connectDB();

    const slug = generateSlug(title);
    const folderPath = `data/novels/${slug}`;

    // Create novel in database
    const novel = await NovelModel.create({
      title,
      author,
      description: description || "",
      genres: genres || [],
      status: status || "ongoing",
      folderPath,
      addedBy: session.userId,
      isPublic: false,
      totalChapters: 0,
    });

    return NextResponse.json(
      {
        success: true,
        data: novel,
        message: "Novel created successfully",
      } as ApiResponse,
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create novel error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create novel",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}
