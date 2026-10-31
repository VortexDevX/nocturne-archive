import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import UserLibraryModel from "@/lib/db/models/UserLibrary";

export async function GET(request: NextRequest) {
  const user = await verifyAuth(request);
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  const novelId = new URL(request.url).searchParams.get("novelId");
  if (!novelId) return NextResponse.json({ success: false }, { status: 400 });
  try {
    await connectDB();
    const item = await UserLibraryModel.findOne({ userId: user.userId, novelId })
      .select("status isFavorite rating").lean();
    return NextResponse.json({ success: true, inLibrary: Boolean(item), data: item },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to check library" }, { status: 500 });
  }
}
