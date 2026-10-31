import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import UserLibraryModel from "@/lib/db/models/UserLibrary";
import ReadingProgressModel from "@/lib/db/models/ReadingProgress";
import BookmarkModel from "@/lib/db/models/Bookmark";

// Existing records provide a useful timeline even for books added before this view.
export async function GET(request: NextRequest) {
  const user = await verifyAuth(request);
  if (!user) return NextResponse.json({ success: false }, { status: 401 });
  const novelId = new URL(request.url).searchParams.get("novelId");
  if (!novelId) return NextResponse.json({ success: false }, { status: 400 });
  try {
    await connectDB();
    const filter = { userId: user.userId, novelId };
    const [library, progress, bookmarks] = await Promise.all([
      UserLibraryModel.findOne(filter).select("status addedAt lastStatusChange").lean(),
      ReadingProgressModel.findOne(filter).select("currentChapter chaptersRead lastReadAt").lean(),
      BookmarkModel.find(filter).select("chapterNumber chapterTitle createdAt").sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    const events: { id: string; title: string; date: string; chapter?: number }[] = [];
    const add = (id: string, title: string, date: unknown, chapter?: number) => {
      const timestamp = new Date(String(date));
      if (Number.isFinite(timestamp.getTime())) events.push({ id, title, date: timestamp.toISOString(), chapter });
    };
    if (library) {
      add("added", "Added to your library", library.addedAt);
      const labels = { plan_to_read: "Plan to read", reading: "Reading", completed: "Completed", dropped: "Dropped" };
      add("status", `Shelf: ${labels[library.status]}`, library.lastStatusChange);
    }
    if (progress) add("reading", `Last read chapter ${progress.currentChapter}`, progress.lastReadAt, progress.currentChapter);
    for (const bookmark of bookmarks) add(`bookmark-${bookmark._id}`, `Saved a passage in chapter ${bookmark.chapterNumber}`, bookmark.createdAt, bookmark.chapterNumber);
    events.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    return NextResponse.json({ success: true, data: events, chaptersRead: progress?.chaptersRead?.length || 0 },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to load activity" }, { status: 500 });
  }
}
