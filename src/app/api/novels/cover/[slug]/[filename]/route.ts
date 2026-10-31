import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { getCoverImagePath, isSafePathSegment } from "@/lib/utils/fileSystem";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; filename: string }> },
) {
  try {
    const { slug, filename } = await params;
    if (
      !isSafePathSegment(slug) ||
      !isSafePathSegment(filename) ||
      !/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)
    )
      return new NextResponse("Cover not found", { status: 404 });
    const filepath = await getCoverImagePath(slug, filename);

    if (!(await stat(filepath)).isFile()) {
      return new NextResponse("Cover not found", { status: 404 });
    }

    const file = await readFile(filepath);
    const ext = path.extname(filename).toLowerCase();

    const contentTypes: { [key: string]: string } = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentTypes[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return new NextResponse("Cover not found", { status: 404 });
    console.error("Cover serve error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
