"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft,
  FiBookOpen,
  FiMenu,
  FiShare2,
  FiBookmark,
  FiPlay,
  FiHeart,
  FiChevronDown,
  FiCheck,
  FiSearch,
  FiX,
  FiClock,
  FiTrendingUp,
  FiEye,
  FiFilter,
  FiChevronRight,
  FiHash,
  FiChevronsLeft,
  FiChevronsRight,
  FiChevronLeft,
  FiBook,
} from "react-icons/fi";
import Button from "@/components/ui/Button";
import { useHamburger } from "../../layout";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import toast from "react-hot-toast";

interface NovelData {
  slug: string;
  title: string;
  author: string;
  description: string;
  coverImage: string;
  genres: string[];
  status: string;
  totalChapters: number;
  chapters: { number: number; title: string; file: string }[];
}

interface ReadingProgress {
  currentChapter: number;
  currentPosition: number;
  lastReadAt: Date;
  chaptersRead: number[];
}

interface LibraryStatus {
  inLibrary: boolean;
  status?: "plan_to_read" | "reading" | "completed" | "dropped";
  isFavorite?: boolean;
}

type TabType = "chapters" | "details" | "activity";

export default function NovelDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toggleSidebar } = useHamburger();
  const chapterListRef = useRef<HTMLDivElement>(null);

  const [novel, setNovel] = useState<NovelData | null>(null);
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>({
    inLibrary: false,
  });
  const [loading, setLoading] = useState(true);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("chapters");
  const [chapterSearch, setChapterSearch] = useState("");
  const [showJumpTo, setShowJumpTo] = useState(false);
  const [jumpToNumber, setJumpToNumber] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    fetchNovel();
    fetchProgress();
    checkLibraryStatus();
  }, [params.id]);

  const fetchNovel = async () => {
    try {
      const response = await fetch(`/api/novels/${params.id}`);

      // Check if response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setNovel(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch novel:", error);
      toast.error("Failed to load novel");
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch(
        `/api/reading/progress?novelId=${params.id}`,
      );

      if (!response.ok) {
        console.warn("Failed to fetch progress");
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        setProgress(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    }
  };

  const checkLibraryStatus = async () => {
    try {
      const response = await fetch(`/api/library/check?novelId=${params.id}`);

      if (!response.ok) {
        console.warn("Failed to check library status");
        return;
      }

      const data = await response.json();

      if (data.success) {
        setLibraryStatus({
          inLibrary: data.inLibrary,
          status: data.data?.status,
          isFavorite: data.data?.isFavorite,
        });
      }
    } catch (error) {
      console.error("Failed to check library status:", error);
    }
  };

  const handleAddToLibrary = async (status: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          novelId: params.id,
          status,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Added to library!");
        checkLibraryStatus();
      } else if (data.alreadyExists) {
        toast.error("Already in your library");
      } else {
        toast.error(data.error || "Failed to add to library");
      }
    } catch (error) {
      console.error("Failed to add to library:", error);
      toast.error("Failed to add to library");
    } finally {
      setUpdatingStatus(false);
      setShowStatusMenu(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch("/api/library", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          novelId: params.id,
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Status updated!");
        checkLibraryStatus();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
      setShowStatusMenu(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const response = await fetch("/api/library", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          novelId: params.id,
          isFavorite: !libraryStatus.isFavorite,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          libraryStatus.isFavorite
            ? "Removed from favorites"
            : "Added to favorites!",
        );
        checkLibraryStatus();
      } else {
        toast.error(data.error || "Failed to update favorite");
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast.error("Failed to update favorite");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: novel?.title || "Novel",
      text: `Check out ${novel?.title} by ${novel?.author}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleStartReading = () => {
    if (novel && novel.chapters.length > 0) {
      router.push(`/reader/${novel.slug}/${novel.chapters[0].number}`);
    }
  };

  const handleContinueReading = () => {
    if (novel && progress) {
      router.push(`/reader/${novel.slug}/${progress.currentChapter}`);
    } else {
      handleStartReading();
    }
  };

  const handleLastChapter = () => {
    if (novel && novel.chapters.length > 0) {
      const lastChapter = novel.chapters[novel.chapters.length - 1];
      router.push(`/reader/${novel.slug}/${lastChapter.number}`);
    }
  };

  const handleJumpToChapter = () => {
    const chapterNum = parseInt(jumpToNumber);
    if (novel && chapterNum > 0 && chapterNum <= novel.totalChapters) {
      router.push(`/reader/${novel.slug}/${chapterNum}`);
    } else {
      toast.error("Invalid chapter number");
    }
  };

  // Filtered chapters based on search and filter
  const filteredChapters = useMemo(() => {
    if (!novel) return [];

    let filtered = novel.chapters;

    // Search filter
    if (chapterSearch) {
      filtered = filtered.filter(
        (chapter) =>
          chapter.title.toLowerCase().includes(chapterSearch.toLowerCase()) ||
          chapter.number.toString().includes(chapterSearch),
      );
    }

    // Unread filter
    if (filterUnread && progress) {
      filtered = filtered.filter(
        (chapter) => !progress.chaptersRead.includes(chapter.number),
      );
    }

    return filtered;
  }, [novel, chapterSearch, filterUnread, progress]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredChapters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedChapters = filteredChapters.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [chapterSearch, filterUnread]);

  // Scroll to top when page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    chapterListRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Max page numbers to show

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis-start");
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis-end");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading novel...</p>
        </div>
      </div>
    );
  }

  if (!novel) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <div className="flex items-center justify-center w-16 h-16 mb-4">
          <FiBook className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Novel Not Found</h2>
        <p className="text-muted-foreground mb-6">
          This novel doesn't exist or has been removed
        </p>
        <Button onClick={() => router.push("/library")}>
          <FiArrowLeft className="mr-2" />
          Back to Library
        </Button>
      </div>
    );
  }

  const progressPercent = progress
    ? Math.floor((progress.currentChapter / novel.totalChapters) * 100)
    : 0;

  const statusConfig = {
    plan_to_read: {
      label: "Plan to Read",
      color: "bg-orange-500/10 text-orange-500 border-orange-500/30",
    },
    reading: {
      label: "Reading",
      color: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    },
    completed: {
      label: "Completed",
      color: "bg-green-500/10 text-green-500 border-green-500/30",
    },
    dropped: {
      label: "Dropped",
      color: "bg-red-500/10 text-red-500 border-red-500/30",
    },
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="md:block hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <button
              onClick={() => router.push("/library")}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <FiShare2 className="h-5 w-5" />
            </button>
            <ThemeDropdown />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 lg:pb-6">
        {/* Hero Section */}
        <div className="relative border-b border-border">
          {/* Background Blur */}
          <div className="absolute inset-0 overflow-hidden">
            {novel.coverImage && (
              <div
                className="absolute inset-0 bg-cover bg-center blur-3xl opacity-10 scale-110"
                style={{ backgroundImage: `url(${novel.coverImage})` }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 py-6 lg:py-10">
            <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
              {/* Cover Image - Smaller on Mobile */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-shrink-0"
              >
                <div className="w-32 sm:w-40 lg:w-52 aspect-[2/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-2xl border-2 border-border mx-auto lg:mx-0 ring-1 ring-white/10">
                  {novel.coverImage ? (
                    <img
                      src={novel.coverImage}
                      alt={novel.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <FiBookOpen className="w-12 h-12 lg:w-14 lg:h-14 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Novel Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex-1 min-w-0"
              >
                {/* Title & Author */}
                <div className="mb-3">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 leading-tight">
                    {novel.title}
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                    by {novel.author}
                  </p>
                </div>

                {/* Meta Info - Status & Genres */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs border ${
                      novel.status === "completed"
                        ? "bg-green-500/10 text-green-500 border-green-500/30"
                        : novel.status === "ongoing"
                          ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
                          : "bg-orange-500/10 text-orange-500 border-orange-500/30"
                    }`}
                  >
                    {novel.status.charAt(0).toUpperCase() +
                      novel.status.slice(1)}
                  </span>

                  {libraryStatus.inLibrary && libraryStatus.status && (
                    <span
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs border inline-flex items-center gap-1.5 ${
                        statusConfig[libraryStatus.status].color
                      }`}
                    >
                      <FiBookmark className="h-3 w-3" />
                      {statusConfig[libraryStatus.status].label}
                    </span>
                  )}
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {novel.genres.slice(0, 4).map((genre) => (
                    <span
                      key={genre}
                      className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                    >
                      {genre}
                    </span>
                  ))}
                  {novel.genres.length > 4 && (
                    <span className="px-2.5 py-1 rounded-md bg-secondary text-muted-foreground text-xs font-medium">
                      +{novel.genres.length - 4} more
                    </span>
                  )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FiBookOpen className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Chapters
                      </span>
                    </div>
                    <p className="text-lg font-bold">{novel.totalChapters}</p>
                  </div>

                  <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FiTrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-muted-foreground">
                        Progress
                      </span>
                    </div>
                    <p className="text-lg font-bold">{progressPercent}%</p>
                  </div>

                  <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FiEye className="h-4 w-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground">
                        Read
                      </span>
                    </div>
                    <p className="text-lg font-bold">
                      {progress?.chaptersRead.length || 0}
                    </p>
                  </div>
                </div>

                {/* Progress Bar (if reading) */}
                {progress && progressPercent > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Reading Progress
                      </span>
                      <span className="text-xs font-bold text-primary">
                        Chapter {progress.currentChapter}/{novel.totalChapters}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Description - Expandable */}
                <div className="mb-4">
                  <motion.p
                    className={`text-sm lg:text-base text-muted-foreground leading-relaxed ${
                      descriptionExpanded ? "" : "line-clamp-2 lg:line-clamp-3"
                    }`}
                  >
                    {novel.description || "No description available."}
                  </motion.p>
                  {novel.description && novel.description.length > 150 && (
                    <button
                      onClick={() =>
                        setDescriptionExpanded(!descriptionExpanded)
                      }
                      className="text-primary text-sm font-medium mt-2 hover:underline inline-flex items-center gap-1"
                    >
                      {descriptionExpanded ? "Show Less" : "Show More"}
                      <motion.div
                        animate={{ rotate: descriptionExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <FiChevronDown className="h-4 w-4" />
                      </motion.div>
                    </button>
                  )}
                </div>

                {/* Desktop Action Buttons */}
                <div className="hidden lg:flex flex-wrap gap-3">
                  {progress ? (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleContinueReading}
                      className="shadow-lg shadow-primary/25"
                    >
                      <FiPlay className="mr-2" />
                      Continue Reading
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleStartReading}
                      className="shadow-lg shadow-primary/25"
                    >
                      <FiBookOpen className="mr-2" />
                      Start Reading
                    </Button>
                  )}

                  {progress && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={handleStartReading}
                    >
                      From Start
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={handleLastChapter}
                  >
                    <FiClock className="mr-2" />
                    Latest
                  </Button>

                  {/* Library Status Dropdown */}
                  <div className="relative">
                    <Button
                      variant={libraryStatus.inLibrary ? "secondary" : "ghost"}
                      size="lg"
                      onClick={() => setShowStatusMenu(!showStatusMenu)}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      ) : libraryStatus.inLibrary ? (
                        <FiCheck className="mr-2" />
                      ) : (
                        <FiBookmark className="mr-2" />
                      )}
                      {libraryStatus.inLibrary
                        ? "In Library"
                        : "Add to Library"}
                      <FiChevronDown className="ml-2 h-4 w-4" />
                    </Button>

                    <AnimatePresence>
                      {showStatusMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowStatusMenu(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute top-full mt-2 right-0 w-56 bg-card border-2 border-border rounded-xl shadow-2xl z-20 overflow-hidden"
                          >
                            {[
                              {
                                value: "plan_to_read",
                                label: "Plan to Read",
                                icon: FiBookmark,
                              },
                              {
                                value: "reading",
                                label: "Reading",
                                icon: FiBookOpen,
                              },
                              {
                                value: "completed",
                                label: "Completed",
                                icon: FiCheck,
                              },
                              {
                                value: "dropped",
                                label: "Dropped",
                                icon: FiX,
                              },
                            ].map((option) => {
                              const Icon = option.icon;
                              const isActive =
                                libraryStatus.status === option.value;

                              return (
                                <button
                                  key={option.value}
                                  onClick={() =>
                                    libraryStatus.inLibrary
                                      ? handleUpdateStatus(option.value)
                                      : handleAddToLibrary(option.value)
                                  }
                                  className={`w-full px-4 py-3 text-left hover:bg-secondary transition-colors flex items-center gap-3 ${
                                    isActive ? "bg-primary/5" : ""
                                  }`}
                                >
                                  <Icon
                                    className={`h-4 w-4 ${
                                      isActive
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                    }`}
                                  />
                                  <span
                                    className={`font-medium text-sm ${
                                      isActive ? "text-primary" : ""
                                    }`}
                                  >
                                    {option.label}
                                  </span>
                                  {isActive && (
                                    <FiCheck className="ml-auto h-4 w-4 text-primary" />
                                  )}
                                </button>
                              );
                            })}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Icon Actions */}
                  {libraryStatus.inLibrary && (
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={handleToggleFavorite}
                      className="!px-3"
                    >
                      <FiHeart
                        className={`h-5 w-5 ${
                          libraryStatus.isFavorite
                            ? "fill-red-500 text-red-500"
                            : ""
                        }`}
                      />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleShare}
                    className="!px-3"
                  >
                    <FiShare2 className="h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Tabs - FIXED: Removed sticky on mobile, adjusted z-index */}
        <div className="lg:sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {[
                {
                  id: "chapters",
                  label: "Chapters",
                  count: novel.totalChapters,
                },
                { id: "details", label: "Details" },
                { id: "activity", label: "Activity" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {tab.count}
                      </span>
                    )}
                  </span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            {activeTab === "chapters" && (
              <motion.div
                key="chapters"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Search & Filter Bar - FIXED: Better mobile layout */}
                <div className="mb-4 flex flex-col gap-3" ref={chapterListRef}>
                  {/* Search */}
                  <div className="relative w-full">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search chapters..."
                      value={chapterSearch}
                      onChange={(e) => setChapterSearch(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-card border-2 border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                    />
                    {chapterSearch && (
                      <button
                        onClick={() => setChapterSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-md transition-colors"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Jump To Chapter & Filter - FIXED: Stacked on mobile */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1 sm:flex-none">
                      <Button
                        variant="secondary"
                        onClick={() => setShowJumpTo(!showJumpTo)}
                        className="w-full sm:w-auto"
                      >
                        <FiHash className="mr-2" />
                        Jump to Chapter
                      </Button>

                      <AnimatePresence>
                        {showJumpTo && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setShowJumpTo(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute top-full mt-2 left-0 sm:right-0 sm:left-auto w-full sm:w-64 bg-card border-2 border-border rounded-lg shadow-2xl z-20 p-3"
                            >
                              <label className="block text-xs font-medium text-muted-foreground mb-2">
                                Chapter Number
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  max={novel.totalChapters}
                                  value={jumpToNumber}
                                  onChange={(e) =>
                                    setJumpToNumber(e.target.value)
                                  }
                                  placeholder="e.g., 42"
                                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:border-primary focus:outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleJumpToChapter();
                                      setShowJumpTo(false);
                                    }
                                  }}
                                />
                                <Button
                                  variant="primary"
                                  onClick={() => {
                                    handleJumpToChapter();
                                    setShowJumpTo(false);
                                  }}
                                  className="!px-3"
                                >
                                  <FiChevronRight />
                                </Button>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Filter Unread */}
                    <Button
                      variant={filterUnread ? "primary" : "secondary"}
                      onClick={() => setFilterUnread(!filterUnread)}
                      className="w-full sm:w-auto"
                    >
                      <FiFilter className="mr-2" />
                      {filterUnread ? "Show All" : "Unread Only"}
                    </Button>
                  </div>
                </div>

                {/* Results Count & Pagination Info */}
                {(chapterSearch || filterUnread || totalPages > 1) && (
                  <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                    <span>
                      {chapterSearch || filterUnread ? (
                        <>
                          Showing {filteredChapters.length} of{" "}
                          {novel.totalChapters} chapters
                        </>
                      ) : (
                        <>
                          Showing {startIndex + 1}-
                          {Math.min(endIndex, filteredChapters.length)} of{" "}
                          {filteredChapters.length} chapters
                        </>
                      )}
                    </span>
                    {totalPages > 1 && (
                      <span className="font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                    )}
                  </div>
                )}

                {/* Chapters List - FIXED: Better mobile spacing + NO OVERFLOW */}
                <div className="grid gap-2 sm:gap-3 mb-6">
                  {paginatedChapters.length > 0 ? (
                    paginatedChapters.map((chapter, index) => {
                      const isRead = progress?.chaptersRead.includes(
                        chapter.number,
                      );
                      const isCurrent =
                        progress?.currentChapter === chapter.number;

                      return (
                        <motion.button
                          key={chapter.number}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(index * 0.02, 0.3) }}
                          onClick={() =>
                            router.push(
                              `/reader/${novel.slug}/${chapter.number}`,
                            )
                          }
                          className={`w-full flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all group text-left overflow-hidden ${
                            isCurrent
                              ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                              : isRead
                                ? "border-border bg-card/30 hover:bg-card/50"
                                : "border-border bg-card hover:border-primary/30 hover:shadow-md"
                          }`}
                        >
                          {/* Chapter Number */}
                          <div
                            className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base ${
                              isCurrent
                                ? "bg-primary/10 text-primary"
                                : isRead
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            } transition-colors`}
                          >
                            {chapter.number}
                          </div>

                          {/* Chapter Title - FIXED: Proper truncation */}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h3
                              className={`font-medium text-sm sm:text-base truncate ${
                                isCurrent
                                  ? "text-primary"
                                  : "group-hover:text-primary"
                              } transition-colors`}
                            >
                              {chapter.title}
                            </h3>
                            {isCurrent && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                Currently reading
                              </p>
                            )}
                          </div>

                          {/* Status Indicators */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            {isCurrent && (
                              <span className="hidden sm:inline-flex px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold whitespace-nowrap">
                                Reading
                              </span>
                            )}
                            {isRead && !isCurrent && (
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                <FiCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500" />
                              </div>
                            )}
                            <FiChevronRight
                              className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${
                                isCurrent
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover:text-primary"
                              } transition-colors`}
                            />
                          </div>
                        </motion.button>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <FiSearch className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                      <p className="text-muted-foreground">No chapters found</p>
                      {(chapterSearch || filterUnread) && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setChapterSearch("");
                            setFilterUnread(false);
                          }}
                          className="mt-3"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Pagination Controls - FIXED: Better mobile layout */}
                {totalPages > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-4 pt-4 border-t border-border"
                  >
                    {/* Mobile: Compact Pagination */}
                    <div className="flex sm:hidden items-center justify-center gap-1.5 w-full">
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="!px-2.5 !py-2"
                        size="sm"
                      >
                        <FiChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="!px-2.5 !py-2"
                        size="sm"
                      >
                        <FiChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex-1 max-w-[120px] px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-center">
                        <span className="text-sm font-bold text-primary">
                          {currentPage} / {totalPages}
                        </span>
                      </div>

                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="!px-2.5 !py-2"
                        size="sm"
                      >
                        <FiChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="!px-2.5 !py-2"
                        size="sm"
                      >
                        <FiChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Desktop: Full Pagination */}
                    <div className="hidden sm:flex items-center gap-2">
                      {/* First & Previous */}
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        size="sm"
                      >
                        <FiChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        size="sm"
                      >
                        <FiChevronLeft className="h-4 w-4 mr-1" />
                        Prev
                      </Button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {getPageNumbers().map((page, index) => {
                          if (typeof page === "string") {
                            return (
                              <span
                                key={`ellipsis-${index}`}
                                className="px-2 text-muted-foreground"
                              >
                                ...
                              </span>
                            );
                          }

                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`min-w-[40px] h-10 px-3 rounded-lg font-medium transition-all ${
                                currentPage === page
                                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                  : "bg-card border border-border hover:border-primary/30 hover:bg-primary/5"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                      </div>

                      {/* Next & Last */}
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        size="sm"
                      >
                        Next
                        <FiChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        size="sm"
                      >
                        <FiChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Full Description */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Description</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {novel.description || "No description available."}
                  </p>
                </div>

                {/* All Genres */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {novel.genres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm font-medium"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Information</h3>
                  <div className="grid gap-3">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium capitalize">
                        {novel.status}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Author</span>
                      <span className="font-medium">{novel.author}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">
                        Total Chapters
                      </span>
                      <span className="font-medium">{novel.totalChapters}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "activity" && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="text-center py-12"
              >
                <FiClock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">
                  Activity tracking coming soon
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t-2 border-border p-4 pb-safe"
      >
        <div className="flex gap-2">
          {progress ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleContinueReading}
              className="flex-1 shadow-lg shadow-primary/25"
            >
              <FiPlay className="mr-2" />
              Continue Reading
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleStartReading}
              className="flex-1 shadow-lg shadow-primary/25 mb-4"
            >
              <FiBookOpen className="mr-2" />
              Start Reading
            </Button>
          )}

          {/* Library Status Button - Always visible */}
          <Button
            variant={libraryStatus.inLibrary ? "secondary" : "secondary"}
            size="lg"
            onClick={() => setShowStatusMenu(true)}
            className="!px-4"
            disabled={updatingStatus}
          >
            {updatingStatus ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : libraryStatus.inLibrary ? (
              <FiCheck className="h-5 w-5 text-green-500" />
            ) : (
              <FiBookmark className="h-5 w-5" />
            )}
          </Button>

          {/* Favorite Button - Only when in library */}
          {libraryStatus.inLibrary && (
            <Button
              variant="ghost"
              size="lg"
              onClick={handleToggleFavorite}
              className="!px-4"
            >
              <FiHeart
                className={`h-5 w-5 ${
                  libraryStatus.isFavorite ? "fill-red-500 text-red-500" : ""
                }`}
              />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Mobile Status Menu Modal */}
      <AnimatePresence>
        {showStatusMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-[100]"
              onClick={() => setShowStatusMenu(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border rounded-t-3xl z-[100] pb-safe overflow-hidden"
            >
              <div className="p-4">
                {/* Handle bar */}
                <div className="w-12 h-1.5 bg-border rounded-full mx-auto mb-4" />

                <h3 className="text-lg font-bold mb-1">
                  {libraryStatus.inLibrary ? "Change Status" : "Add to Library"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {libraryStatus.inLibrary
                    ? "Update your reading status for this novel"
                    : "Choose your reading status"}
                </p>

                <div className="space-y-2">
                  {[
                    {
                      value: "plan_to_read",
                      label: "Plan to Read",
                      icon: FiBookmark,
                    },
                    { value: "reading", label: "Reading", icon: FiBookOpen },
                    { value: "completed", label: "Completed", icon: FiCheck },
                    { value: "dropped", label: "Dropped", icon: FiX },
                  ].map((option) => {
                    const Icon = option.icon;
                    const isActive = libraryStatus.status === option.value;

                    return (
                      <button
                        key={option.value}
                        onClick={() =>
                          libraryStatus.inLibrary
                            ? handleUpdateStatus(option.value)
                            : handleAddToLibrary(option.value)
                        }
                        disabled={updatingStatus}
                        className={`w-full px-4 py-4 rounded-xl text-left transition-all flex items-center gap-4 ${
                          isActive
                            ? "bg-primary/10 border-2 border-primary"
                            : "bg-secondary/50 border-2 border-transparent hover:bg-secondary"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            isActive ? "bg-primary/20" : "bg-secondary"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <span
                          className={`font-medium ${
                            isActive ? "text-primary" : ""
                          }`}
                        >
                          {option.label}
                        </span>
                        {isActive && (
                          <FiCheck className="ml-auto h-5 w-5 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Cancel button */}
                <button
                  onClick={() => setShowStatusMenu(false)}
                  className="w-full mt-4 py-3 rounded-xl bg-secondary text-foreground font-medium"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
