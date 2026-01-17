"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiClock,
  FiBookOpen,
  FiMenu,
  FiCalendar,
  FiTrendingUp,
  FiCheckCircle,
  FiPlay,
  FiInfo,
  FiBookmark,
} from "react-icons/fi";
import Button from "@/components/ui/Button";
import { useHamburger } from "../layout";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import { ContinueReadingItem } from "@/types";
import { useRouter } from "next/navigation";

interface GroupedData {
  today: ContinueReadingItem[];
  yesterday: ContinueReadingItem[];
  older: ContinueReadingItem[];
}

export default function ContinuePage() {
  const { toggleSidebar } = useHamburger();
  const router = useRouter();
  const [data, setData] = useState<ContinueReadingItem[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedData>({
    today: [],
    yesterday: [],
    older: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContinueReading();
  }, []);

  const fetchContinueReading = async () => {
    try {
      const response = await fetch("/api/reading/continue");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setGroupedData(result.grouped);
      }
    } catch (error) {
      console.error("Failed to fetch continue reading:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <MobileHeader count="..." toggleSidebar={toggleSidebar} />
        <DesktopHeader count="..." />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear",
              }}
              className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full mx-auto mb-4"
            />
            <p className="text-muted-foreground font-medium">
              Loading your reading progress...
            </p>
          </div>
        </div>
      </>
    );
  }

  if (data.length === 0) {
    return (
      <>
        <MobileHeader count="0" toggleSidebar={toggleSidebar} />
        <DesktopHeader count="0" />
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-6"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-5xl mb-4 mx-auto">
              📚
            </div>
          </motion.div>
          <h3 className="text-2xl font-bold mb-2">No reading in progress</h3>
          <p className="text-muted-foreground mb-8 max-w-md">
            Start reading a novel from your library to track your progress here
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push("/library")}
          >
            <FiBookOpen className="mr-2" />
            Browse Library
          </Button>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <MobileHeader
        count={data.length.toString()}
        toggleSidebar={toggleSidebar}
      />
      <DesktopHeader count={data.length.toString()} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-6">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-8 space-y-8">
          {/* Stats Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-3 gap-3 lg:gap-4"
          >
            <StatCard
              icon={<FiBookOpen />}
              label="Reading"
              value={data.length}
              color="from-blue-500 to-cyan-500"
            />
            <StatCard
              icon={<FiTrendingUp />}
              label="In Progress"
              value={
                data.length > 0
                  ? Math.round(
                      data.reduce(
                        (sum, item) => sum + item.progressPercent,
                        0
                      ) / data.length
                    )
                  : 0
              }
              suffix="%"
              color="from-green-500 to-emerald-500"
            />
            <StatCard
              icon={<FiCheckCircle />}
              label="Chapters"
              value={data.reduce((sum, item) => sum + item.chaptersRead, 0)}
              color="from-purple-500 to-pink-500"
            />
          </motion.div>

          {/* Today Section */}
          {groupedData.today.length > 0 && (
            <Section
              title="Today"
              icon={<FiCalendar />}
              color="text-green-500"
              items={groupedData.today}
            />
          )}

          {/* Yesterday Section */}
          {groupedData.yesterday.length > 0 && (
            <Section
              title="Yesterday"
              icon={<FiClock />}
              color="text-blue-500"
              items={groupedData.yesterday}
            />
          )}

          {/* Older Section */}
          {groupedData.older.length > 0 && (
            <Section
              title="Earlier"
              icon={<FiClock />}
              color="text-purple-500"
              items={groupedData.older}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Mobile Header Component
function MobileHeader({
  count,
  toggleSidebar,
}: {
  count: string;
  toggleSidebar: () => void;
}) {
  return (
    <header className="lg:hidden border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="md:block hidden p-2 hover:bg-secondary rounded-xl transition-colors"
          >
            <FiMenu className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold">Continue Reading</h2>
            <p className="text-xs text-muted-foreground">
              {count} {count === "1" ? "novel" : "novels"}
            </p>
          </div>
        </div>
        <ThemeDropdown />
      </div>
    </header>
  );
}

// Desktop Header Component
function DesktopHeader({ count }: { count: string }) {
  return (
    <header className="hidden lg:block border-b border-border bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-2xl shadow-lg">
                ⏱️
              </div>
              Continue Reading
            </h1>
            <p className="text-muted-foreground">
              Pick up where you left off • {count}{" "}
              {count === "1" ? "novel" : "novels"} in progress
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  suffix = "",
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border-2 border-border bg-card p-4 lg:p-5"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5`}
      />
      <div className="relative">
        <div
          className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3 shadow-lg`}
        >
          {icon}
        </div>
        <div className="text-2xl lg:text-3xl font-bold mb-1">
          {value}
          {suffix}
        </div>
        <div className="text-xs lg:text-sm text-muted-foreground font-medium">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

// Section Component
function Section({
  title,
  icon,
  color,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: ContinueReadingItem[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 sticky top-0 lg:top-0 bg-background py-2 z-10">
        <div className={`${color}`}>{icon}</div>
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
        <span className="text-sm text-muted-foreground font-medium">
          {items.length} {items.length === 1 ? "novel" : "novels"}
        </span>
      </div>

      <div className="grid gap-4 lg:gap-5">
        {items.map((item, i) => (
          <NovelCard key={item.novelId} item={item} index={i} />
        ))}
      </div>
    </motion.div>
  );
}

// Novel Card Component
function NovelCard({
  item,
  index,
}: {
  item: ContinueReadingItem;
  index: number;
}) {
  const router = useRouter();

  const colorSchemes = [
    {
      gradient: "from-violet-500 to-purple-500",
      light: "from-violet-500/10 to-purple-500/10",
      ring: "ring-violet-500/20",
    },
    {
      gradient: "from-blue-500 to-cyan-500",
      light: "from-blue-500/10 to-cyan-500/10",
      ring: "ring-blue-500/20",
    },
    {
      gradient: "from-green-500 to-emerald-500",
      light: "from-green-500/10 to-emerald-500/10",
      ring: "ring-green-500/20",
    },
    {
      gradient: "from-orange-500 to-red-500",
      light: "from-orange-500/10 to-red-500/10",
      ring: "ring-orange-500/20",
    },
    {
      gradient: "from-pink-500 to-rose-500",
      light: "from-pink-500/10 to-rose-500/10",
      ring: "ring-pink-500/20",
    },
  ];

  const scheme = colorSchemes[index % colorSchemes.length];

  const handleContinue = () => {
    router.push(`/reader/${item.novelId}/${item.currentChapter}`);
  };

  const handleViewDetails = () => {
    router.push(`/novel/${item.novelId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <div className="relative overflow-hidden rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all">
        {/* Background Gradient */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${scheme.light} opacity-0 group-hover:opacity-100 transition-opacity`}
        />

        <div className="relative p-4 lg:p-5">
          <div className="flex gap-4 lg:gap-5">
            {/* Cover */}
            <div
              className={`relative flex-shrink-0 w-24 h-36 lg:w-28 lg:h-40 rounded-xl overflow-hidden shadow-lg ring-2 ${
                scheme.ring
              } ${
                !item.coverImage ? `bg-gradient-to-br ${scheme.gradient}` : ""
              }`}
            >
              {item.coverImage ? (
                <img
                  src={item.coverImage}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-white">
                  📖
                </div>
              )}

              {/* Progress Ring Overlay */}
              <div className="absolute bottom-2 right-2">
                <div className="relative w-10 h-10">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="3"
                      fill="rgba(0,0,0,0.5)"
                      className="backdrop-blur-sm"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="white"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${item.progressPercent * 1.005} 100.5`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">
                    {item.progressPercent}%
                  </div>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Header */}
              <div className="flex-1">
                {/* Time Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground text-xs font-bold flex items-center gap-1.5 border border-border">
                    <FiClock className="h-3 w-3" />
                    {item.timeSince}
                  </span>
                </div>

                {/* Title & Author */}
                <h3 className="font-bold text-lg lg:text-xl mb-1.5 group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 truncate">
                  {item.author}
                </p>

                {/* Current Chapter */}
                <div className="flex items-start gap-2 text-sm mb-4 p-3 rounded-xl bg-secondary/50 border border-border">
                  <FiBookOpen className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-foreground mb-0.5">
                      Chapter {item.currentChapter}
                    </div>
                    <div className="text-muted-foreground text-xs line-clamp-1">
                      {item.currentChapterTitle}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="text-muted-foreground font-medium">
                      Progress
                    </span>
                    <span className="font-bold text-primary">
                      {item.currentChapter}/{item.totalChapters}
                    </span>
                  </div>
                  <div className="h-2.5 bg-secondary rounded-full overflow-hidden border border-border">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.progressPercent}%` }}
                      transition={{ delay: index * 0.05, duration: 0.8 }}
                      className={`h-full bg-gradient-to-r ${scheme.gradient} rounded-full shadow-sm`}
                    />
                  </div>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {item.genres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium border border-primary/20"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions - Desktop */}
              <div className="hidden lg:flex items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleContinue}
                  className="flex-1"
                >
                  <FiPlay className="mr-2" />
                  Continue Reading
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={handleViewDetails}
                  className="flex-shrink-0"
                >
                  <FiInfo />
                </Button>
              </div>
            </div>
          </div>

          {/* Actions - Mobile */}
          <div className="lg:hidden mt-4 pt-4 border-t border-border flex gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleContinue}
              className="flex-1"
            >
              <FiPlay className="mr-2" />
              Continue
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={handleViewDetails}
              className="flex-shrink-0"
            >
              <FiInfo />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
