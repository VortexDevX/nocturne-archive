import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import ReadingProgressModel from "@/lib/db/models/ReadingProgress";
import ReadingSessionModel from "@/lib/db/models/ReadingSession";
import NovelModel from "@/lib/db/models/Novel";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get all reading progress for user
    const allProgress = await ReadingProgressModel.find({
      userId: user.userId,
    }).lean();

    // Get all reading sessions
    const allSessions = await ReadingSessionModel.find({
      userId: user.userId,
    }).lean();

    // Calculate stats
    const totalNovelsRead = allProgress.length;

    const totalChaptersRead = allProgress.reduce(
      (sum, p) => sum + (p.chaptersRead?.length || 0),
      0
    );

    const totalWordsRead = allSessions.reduce(
      (sum, s) => sum + (s.wordsRead || 0),
      0
    );

    const totalMinutes = allSessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );
    const hoursRead = Math.floor(totalMinutes / 60);

    // Calculate streak
    const sortedProgress = allProgress.sort(
      (a, b) =>
        new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const progress of sortedProgress) {
      const readDate = new Date(progress.lastReadAt);
      readDate.setHours(0, 0, 0, 0);

      if (!lastDate) {
        tempStreak = 1;
        lastDate = readDate;
      } else {
        const diffTime = lastDate.getTime() - readDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
        lastDate = readDate;
      }
    }

    currentStreak = tempStreak;
    longestStreak = Math.max(longestStreak, tempStreak);

    // Get favorite genres
    const novelIds = allProgress.map((p) => p.novelId);
    const novels = await NovelModel.find({
      slug: { $in: novelIds },
    })
      .select("genres")
      .lean();

    const genreCounts: Record<string, number> = {};
    novels.forEach((novel) => {
      novel.genres?.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });

    const favoriteGenres = Object.entries(genreCounts)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        totalNovelsRead,
        totalChaptersRead,
        totalWordsRead,
        hoursRead,
        currentStreak,
        longestStreak,
        favoriteGenres,
      },
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
