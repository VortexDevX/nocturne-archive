import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getNovelFolders,
  readNovelMetadata,
  readChaptersMetadata,
} from "@/lib/utils/fileSystem";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 },
      );
    }

    const novelFolders = await getNovelFolders();
    const novels = [];

    for (const folder of novelFolders) {
      try {
        const metadata = await readNovelMetadata(folder);
        const chapters = await readChaptersMetadata(folder);

        if (metadata) {
          novels.push({
            ...metadata,
            slug: folder,
            totalChapters: chapters.length,
            coverImage: metadata.coverImage
              ? `/api/novels/cover/${encodeURIComponent(folder)}/${metadata.coverImage}`
              : undefined,
          });
        }
      } catch {
        // Skip novels without proper metadata
        console.log(`Skipping novel folder without metadata: ${folder}`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: novels,
      } as ApiResponse,
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("List novels error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to list novels",
        error: error instanceof Error ? error.message : "Failed to list novels",
      } as ApiResponse,
      { status: 500 },
    );
  }
}
