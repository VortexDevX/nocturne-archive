import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb"; // NEW
import UserModel from "@/lib/db/models/User"; // NEW
import {
  readChaptersMetadata,
  writeChaptersMetadata,
  countWords,
} from "@/lib/utils/fileSystem";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import type { ApiResponse, ChapterMetadata } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    await connectDB();
    const user = await UserModel.findById(session.userId).select(
      "isAdmin canUpload"
    );
    if (!user || (!user.isAdmin && !user.canUpload)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" } as ApiResponse,
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const slug = formData.get("slug") as string;
    const titlesJson = formData.get("titles") as string | null;

    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Novel slug is required" } as ApiResponse,
        { status: 400 }
      );
    }

    let titlesMap: Record<number, string> = {};
    if (titlesJson) {
      try {
        titlesMap = JSON.parse(titlesJson);
      } catch (error) {
        console.error("Failed to parse titles JSON:", error);
      }
    }

    const chaptersDir = path.join(
      process.cwd(),
      "data",
      "novels",
      slug,
      "chapters"
    );
    await mkdir(chaptersDir, { recursive: true });

    const existingChapters = await readChaptersMetadata(slug);
    const newChapters: ChapterMetadata[] = [];
    const files = formData.getAll("chapters") as File[];

    for (const file of files) {
      const content = await file.text();
      const wordCount = countWords(content);
      if (wordCount < 10) continue;

      const originalName = file.name.split("/").pop() || file.name;
      const cleanName = originalName.split("\\").pop() || originalName;

      const chapterNumber = existingChapters.length + newChapters.length + 1;
      const chapterTitle =
        titlesMap[chapterNumber] || `Chapter ${chapterNumber}`;

      const sanitizedTitle = chapterTitle.replace(/[\\/*?:"<>|]/g, "");
      const filename = `${String(chapterNumber).padStart(
        4,
        "0"
      )} - ${sanitizedTitle}.txt`;

      const chapterPath = path.join(chaptersDir, filename);
      await writeFile(chapterPath, content, "utf-8");

      newChapters.push({
        number: chapterNumber,
        title: chapterTitle,
        file: filename,
      });
    }

    const allChapters = [...existingChapters, ...newChapters];
    await writeChaptersMetadata(slug, allChapters);

    return NextResponse.json(
      {
        success: true,
        data: {
          addedChapters: newChapters.length,
          totalChapters: allChapters.length,
        },
        message: `Successfully uploaded ${newChapters.length} chapters`,
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Chapter upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to upload chapters",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}
