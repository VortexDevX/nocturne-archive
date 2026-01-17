import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  readChapterContent,
  readChaptersMetadata,
} from "@/lib/utils/fileSystem";
import type { ApiResponse } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; chapterNumber: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    const { slug, chapterNumber } = await params;
    const chapterNum = parseInt(chapterNumber, 10);

    if (isNaN(chapterNum)) {
      return NextResponse.json(
        { success: false, message: "Invalid chapter number" } as ApiResponse,
        { status: 400 }
      );
    }

    const chapters = await readChaptersMetadata(slug);
    const chapter = chapters.find((ch) => ch.number === chapterNum);

    if (!chapter) {
      return NextResponse.json(
        { success: false, message: "Chapter not found" } as ApiResponse,
        { status: 404 }
      );
    }

    const content = await readChapterContent(slug, chapter.file);

    if (!content) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to read chapter content",
        } as ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...chapter,
          content,
        },
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Get chapter error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to get chapter",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}
