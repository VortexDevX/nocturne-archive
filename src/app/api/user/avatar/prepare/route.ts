import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import AvatarUploadModel from "@/lib/db/models/AvatarUpload";
import { usesR2 } from "@/lib/storage/config";
import { segment } from "@/lib/storage/keys";
import { createUploadUrl } from "@/lib/storage/r2";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false }, { status: 401 });
  if (!usesR2()) return NextResponse.json({ success: true, data: { backend: "local" } });
  try {
    const data = z.object({ extension: z.enum(["jpg", "jpeg", "png", "webp"]), size: z.number().int().positive().max(3 * 1024 * 1024), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).parse(await request.json());
    const filename = `${segment(session.userId)}-${randomUUID()}.${data.extension}`;
    const key = `avatars/${session.userId}/${filename}`;
    const type = ["jpg", "jpeg"].includes(data.extension) ? "image/jpeg" : `image/${data.extension}`;
    await connectDB();
    await AvatarUploadModel.create({ userId: session.userId, filename, objectKey: key, bytes: data.size, sha256: data.sha256, contentType: type, expiresAt: new Date(Date.now() + 3600000) });
    return NextResponse.json({ success: true, data: { backend: "r2", filename, type, url: await createUploadUrl(key, type) } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof z.ZodError ? "Invalid avatar details" : "Unable to prepare avatar" }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
