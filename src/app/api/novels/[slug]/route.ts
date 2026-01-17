import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  readNovelMetadata,
  readChaptersMetadata,
  novelExists,
} from "@/lib/utils/fileSystem";
import type { ApiResponse } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    const { slug } = await params;

    if (!(await novelExists(slug))) {
      return NextResponse.json(
        { success: false, message: "Novel not found" } as ApiResponse,
        { status: 404 }
      );
    }

    const metadata = await readNovelMetadata(slug);
    const chapters = await readChaptersMetadata(slug);

    if (!metadata) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to read novel metadata",
        } as ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...metadata,
          slug,
          chapters,
          totalChapters: chapters.length,
          coverImage: `/api/novels/cover/${slug}/${metadata.coverImage}`,
        },
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Get novel error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get novel",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}
