import { readableNovelFilter } from "@/lib/storage/config";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import NovelModel from "@/lib/db/models/Novel";
import {
  getNovelFolders,
  readNovelMetadata,
  readChaptersMetadata,
} from "@/lib/utils/fileSystem";
import type { ApiResponse } from "@/types";
import {
  createUploadedNovel,
  requireNovelUploader,
  uploadFailure,
} from "@/lib/novels/upload";

/**
 * GET /api/novels
 * List all novels (from database + file system)
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 },
      );
    }

    await connectDB();

    // Get novels from database
    const dbNovels = await NovelModel.find({ addedBy: session.userId, ...readableNovelFilter() });

    // Get novels from file system
    const novelFolders = await getNovelFolders();
    const fileSystemNovels = [];

    for (const folder of novelFolders) {
      const metadata = await readNovelMetadata(folder);
      const chapters = await readChaptersMetadata(folder);

      if (metadata) {
        // Check if novel exists in database
        const existsInDb = dbNovels.find(
          (novel) =>
            novel.slug === folder ||
            novel.folderPath.replace(/\\/g, "/").split("/").pop() === folder,
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
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Get novels error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get novels",
        error: error instanceof Error ? error.message : "Failed to get novels",
      } as ApiResponse,
      { status: 500 },
    );
  }
}

/**
 * POST /api/novels
 * Create a new novel
 */
export async function POST(request: NextRequest) {
  try {
    const access = await requireNovelUploader();
    if (access.response) return access.response;
    const { novel } = await createUploadedNovel(
      await request.json(),
      access.session.userId,
    );
    return NextResponse.json(
      { success: true, data: novel, message: "Novel created successfully" },
      { status: 201 },
    );
  } catch (error) {
    return uploadFailure(error);
  }
}
