import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; filename: string }> }
) {
  try {
    const { slug, filename } = await params;
    const filepath = path.join(process.cwd(), "data", "novels", slug, filename);

    if (!existsSync(filepath)) {
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
      },
    });
  } catch (error) {
    console.error("Cover serve error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
