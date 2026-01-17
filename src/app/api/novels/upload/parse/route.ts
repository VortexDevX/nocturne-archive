import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { parseChaptersFromText } from "@/lib/utils/chapterParser";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  readChaptersMetadata,
  writeChaptersMetadata,
} from "@/lib/utils/fileSystem";
import type { ApiResponse, ChapterMetadata } from "@/types";

/**
 * Sanitize filename
 */
function sanitizeFilename(title: string): string {
  return title.replace(/[\\/*?:"<>|]/g, "").trim();
}

export async function POST(request: NextRequest) {
  console.log("\n=== 📚 PARSE UPLOAD API ===\n");

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" } as ApiResponse,
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const slug = formData.get("slug") as string;
    const file = formData.get("file") as File;
    const titlesJson = formData.get("titles") as string | null;

    console.log("📋 Request:");
    console.log("   Slug:", slug);
    console.log(
      "   File:",
      file?.name,
      `(${(file?.size / 1024 / 1024).toFixed(2)} MB)`
    );
    console.log("   Has titles:", !!titlesJson, "\n");

    if (!slug || !file) {
      return NextResponse.json(
        { success: false, message: "Slug and file required" } as ApiResponse,
        { status: 400 }
      );
    }

    // Parse titles if provided
    let titlesMap: Record<number, string> = {};
    if (titlesJson) {
      try {
        titlesMap = JSON.parse(titlesJson);
        console.log(
          "✅ Loaded",
          Object.keys(titlesMap).length,
          "custom titles\n"
        );
      } catch (error) {
        console.error("⚠️  Failed to parse titles\n");
      }
    }

    // Parse file based on type
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    let parsedChapters: Array<{ number: number; content: string }> = [];
    let parseErrors: string[] = [];

    if (
      fileType === "text/plain" ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md")
    ) {
      console.log("🔄 Processing as text file...\n");
      const text = await file.text();
      parsedChapters = parseChaptersFromText(text);
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Unsupported file type (use TXT or MD)",
        } as ApiResponse,
        { status: 400 }
      );
    }

    if (parsedChapters.length === 0) {
      console.error("❌ No chapters found\n");
      return NextResponse.json(
        {
          success: false,
          message: "No chapters found in file",
          error: parseErrors.join(", ") || "Could not detect chapter markers",
        } as ApiResponse,
        { status: 400 }
      );
    }

    console.log(`✅ Found ${parsedChapters.length} chapters\n`);

    // Create chapters directory
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

    console.log("💾 Saving to disk...\n");

    // Save each chapter
    for (const chapter of parsedChapters) {
      // Use custom title from titlesMap, or default
      const title = titlesMap[chapter.number] || `Chapter ${chapter.number}`;
      const safeTitle = sanitizeFilename(title);

      const filename = `${String(chapter.number).padStart(
        4,
        "0"
      )} - ${safeTitle}.txt`;
      const chapterPath = path.join(chaptersDir, filename);

      await writeFile(chapterPath, chapter.content, "utf-8");

      newChapters.push({
        number: chapter.number,
        title,
        file: filename,
      });

      // Log progress
      if (newChapters.length <= 5 || newChapters.length % 100 === 0) {
        console.log(`   ${filename}`);
      }
    }

    // Update chapters.json
    const allChapters = [...existingChapters, ...newChapters].sort(
      (a, b) => a.number - b.number
    );
    await writeChaptersMetadata(slug, allChapters);

    console.log(`\n✅ Saved ${newChapters.length} chapters`);
    console.log("=== END ===\n");

    return NextResponse.json({
      success: true,
      data: {
        parsedChapters: newChapters.length,
        totalChapters: allChapters.length,
        chapters: newChapters,
      },
      message: `Successfully parsed and uploaded ${newChapters.length} chapters`,
    } as ApiResponse);
  } catch (error: any) {
    console.error("❌ API Error:", error.message);
    console.error(error.stack);
    console.log("=== END (ERROR) ===\n");

    return NextResponse.json(
      {
        success: false,
        message: "Failed to parse file",
        error: error.message,
      } as ApiResponse,
      { status: 500 }
    );
  }
}
