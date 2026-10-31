import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/session";
import connectDB from "@/lib/db/mongodb";
import ReadingProgressModel from "@/lib/db/models/ReadingProgress";
import NovelModel from "@/lib/db/models/Novel";
import {
  readNovelMetadata,
  readChaptersMetadata,
} from "@/lib/utils/fileSystem";

interface NovelData {
  title: string;
  author: string;
  coverImage?: string;
  totalChapters: number;
  genres: string[];
  slug: string;
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectDB();

    // Get reading progress sorted by last read
    const progressList = await ReadingProgressModel.find({
      userId: user.userId,
      isCompleted: false,
    })
      .sort({ lastReadAt: -1 })
      .limit(20)
      .lean();

    if (progressList.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        grouped: { today: [], yesterday: [], older: [] },
        count: 0,
      });
    }

    const novels = await NovelModel.find({
      slug: { $in: progressList.map((progress) => progress.novelId) },
    })
      .select("title author coverImage totalChapters genres slug")
      .lean();
    const novelMap = new Map(novels.map((novel) => [novel.slug, novel]));

    // One metadata query for the whole shelf.
    const continueReadingData = await Promise.all(
      progressList.map(async (progress) => {
        let novelData: NovelData | null = null;

        // Try to find novel by slug field in MongoDB
        const novelFromDB = novelMap.get(progress.novelId);

        if (novelFromDB) {
          novelData = {
            title: novelFromDB.title,
            author: novelFromDB.author,
            coverImage: novelFromDB.coverImage,
            totalChapters: novelFromDB.totalChapters || 0,
            genres: novelFromDB.genres || [],
            slug: novelFromDB.slug || progress.novelId,
          };
        } else {
          // Fallback: try metadata file

          try {
            const metadata = await readNovelMetadata(progress.novelId);
            if (!metadata) return null;

            novelData = {
              title: metadata.title,
              author: metadata.author,
              coverImage: metadata.coverImage
                ? `/api/novels/cover/${progress.novelId}/${metadata.coverImage}`
                : undefined,
              totalChapters: metadata.totalChapters || 0,
              genres: metadata.genres || [],
              slug: progress.novelId,
            };
          } catch (error) {
            console.error(
              `Failed to load metadata for ${progress.novelId}:`,
              error,
            );
            return null;
          }
        }

        if (!novelData) {
          return null;
        }

        // Get chapters from chapters.json
        let currentChapterTitle = "Unknown Chapter";
        let actualTotalChapters = novelData.totalChapters;

        try {
          const chapters = await readChaptersMetadata(progress.novelId);

          // If totalChapters is 0 or missing, count from chapters.json
          if (!actualTotalChapters || actualTotalChapters === 0) {
            actualTotalChapters = chapters.length;
          }

          // Find current chapter title
          const currentChapter = chapters.find(
            (ch: { number?: number; title?: string }) =>
              ch.number === progress.currentChapter,
          );
          if (currentChapter?.title) {
            currentChapterTitle = currentChapter.title;
          }
        } catch (error) {
          console.error(
            `Could not read chapters.json for ${progress.novelId}:`,
            error,
          );
        }

        // Ensure we have a valid totalChapters
        if (!actualTotalChapters || actualTotalChapters === 0) {
          console.warn(
            `No totalChapters found for ${progress.novelId}, using currentChapter as fallback`,
          );
          actualTotalChapters = progress.currentChapter;
        }

        // Calculate progress percentage
        const progressPercent = Math.min(
          100,
          progress.progressPercent ??
            Math.floor(
              (Math.max(0, progress.currentChapter - 1) / actualTotalChapters) *
                100,
            ),
        );

        // Calculate time since last read
        const timeSince = getTimeSince(progress.lastReadAt);

        return {
          novelId: progress.novelId,
          title: novelData.title,
          author: novelData.author,
          coverImage: novelData.coverImage,
          genres: novelData.genres,
          currentChapter: progress.currentChapter,
          currentChapterTitle,
          totalChapters: actualTotalChapters,
          progressPercent,
          currentScrollPosition:
            progress.currentScrollPosition ?? progress.currentPosition,
          lastReadAt: progress.lastReadAt,
          timeSince,
          chaptersRead: progress.chaptersRead?.length || 0,
        };
      }),
    );

    // Filter out null values (novels that don't exist)
    const validData = continueReadingData.filter((item) => item !== null);

    // Group by time periods
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groupedData = {
      today: validData.filter((item) => new Date(item!.lastReadAt) >= today),
      yesterday: validData.filter((item) => {
        const readDate = new Date(item!.lastReadAt);
        return readDate >= yesterday && readDate < today;
      }),
      older: validData.filter((item) => new Date(item!.lastReadAt) < yesterday),
    };

    return NextResponse.json({
      success: true,
      data: validData,
      grouped: groupedData,
      count: validData.length,
    });
  } catch (error) {
    console.error("Error fetching continue reading:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch continue reading data" },
      { status: 500 },
    );
  }
}

// Helper function to calculate time since
function getTimeSince(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  } else if (diffDays === 1) {
    return "1 day ago";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  }
}
