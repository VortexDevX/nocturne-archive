"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  FiBook,
  FiBookOpen,
  FiClock,
  FiBookmark,
  FiUser,
  FiSettings,
  FiLogOut,
  FiCompass,
  FiGrid,
  FiChevronRight,
  FiTrendingUp,
  FiUserCheck,
  FiChevronsLeft,
} from "react-icons/fi";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import Link from "next/link";

const navItems = [
  {
    icon: FiClock,
    label: "Continue Reading",
    path: "/continue",
    color: "green",
    fetchCount: true,
  },
  { icon: FiBook, label: "Library", path: "/library", color: "blue" },
  { icon: FiCompass, label: "Explore", path: "/explore", color: "purple" },
  { icon: FiBookmark, label: "Bookmarks", path: "/bookmarks", color: "orange" },
];

interface CurrentlyReadingNovel {
  novelId: string;
  title: string;
  coverImage: string;
  currentChapter: number;
  totalChapters: number;
  progressPercent: number;
}

interface UserProfile {
  username: string;
  avatar?: string;
}

export default function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [continueCount, setContinueCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [currentlyReading, setCurrentlyReading] = useState<
    CurrentlyReadingNovel[]
  >([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    fetchContinueReadingData();
    fetchUserProfile();
  }, []);

  const fetchContinueReadingData = async () => {
    try {
      const response = await fetch("/api/reading/continue");
      const data = await response.json();

      if (data.success) {
        // Set count
        setContinueCount(data.count || 0);

        // Set currently reading list (top 2 novels)
        if (data.data) {
          const novels = data.data.slice(0, 2).map((item: any) => ({
            novelId: item.novelId,
            title: item.title,
            coverImage: item.coverImage,
            currentChapter: item.currentChapter,
            totalChapters: item.totalChapters,
            progressPercent: item.progressPercent,
          }));
          setCurrentlyReading(novels);
        }
      }
    } catch (error) {
      console.error("Failed to fetch continue reading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();

      if (data.success && data.user) {
        setUserProfile({
          username: data.user.username,
          avatar: data.user.avatar,
        });
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{
        x: 0,
        opacity: 1,
        width: isCollapsed ? "80px" : "288px",
      }}
      transition={{ type: "spring", bounce: 0.1, duration: 0.6 }}
      className="hidden lg:flex border-r border-border bg-gradient-to-b from-card to-background flex-col h-screen sticky top-0"
      style={{ overflow: "hidden" }}
    >
      {/* Inner wrapper to prevent overflow */}
      <div
        className="flex flex-col h-full w-full"
        style={{ overflow: "hidden" }}
      >
        {/* Collapse Toggle Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleCollapse}
          className="absolute top-5 -right-3 z-50 w-6 h-6 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center border-2 border-background"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <FiChevronsLeft className="h-3.5 w-3.5" />
          </motion.div>
        </motion.button>

        {/* Header */}
        <div className="p-5 pb-4 border-b border-border bg-gradient-to-br from-primary/5 via-background to-background flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <Link href="/library">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", bounce: 0.4 }}
                className="flex items-center gap-2 cursor-pointer overflow-hidden"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="flex-shrink-0"
                >
                  <Image
                    src="/logo.png"
                    alt="Nocturne logo"
                    width={28}
                    height={28}
                    className="rounded-md"
                    priority
                  />
                </motion.div>
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.h1
                      key="title"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-2xl font-bold bg-gradient-to-r from-primary via-primary to-purple-600 bg-clip-text text-transparent overflow-hidden"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      Nocturne
                    </motion.h1>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  key="theme"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="relative z-[60]"
                  style={{ overflow: "visible" }}
                >
                  <ThemeDropdown />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.p
                key="subtitle"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-muted-foreground font-medium overflow-hidden"
              >
                Your reading sanctuary
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Currently Reading Section */}
        <AnimatePresence mode="wait">
          {!isCollapsed && currentlyReading.length > 0 && (
            <motion.div
              key="currently-reading"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="p-4 border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent flex-shrink-0"
              style={{ overflow: "hidden" }}
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <FiTrendingUp className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Currently Reading
                </h3>
              </div>
              <div className="space-y-2">
                {currentlyReading.map((novel, idx) => (
                  <CurrentlyReadingCard
                    key={novel.novelId}
                    novel={novel}
                    delay={idx * 0.1}
                    onClick={() =>
                      router.push(
                        `/reader/${novel.novelId}/${novel.currentChapter}`,
                      )
                    }
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {/* Section Header */}
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                key="nav-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-semibold text-muted-foreground mb-3 px-3 flex items-center gap-2"
              >
                <FiGrid className="h-3.5 w-3.5 flex-shrink-0" />
                <span>LIBRARY</span>
              </motion.div>
            )}
          </AnimatePresence>

          {navItems.map((item, idx) => (
            <NavItem
              key={item.path}
              icon={<item.icon />}
              label={item.label}
              active={pathname === item.path}
              badge={item.fetchCount ? continueCount : undefined}
              badgeLoading={item.fetchCount ? loading : false}
              color={item.color}
              onClick={() => router.push(item.path)}
              delay={idx * 0.05}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent flex-shrink-0" />

        {/* Bottom Actions */}
        <div className="p-4 border-t border-border bg-gradient-to-b from-transparent to-secondary/20 space-y-1.5 flex-shrink-0 overflow-x-hidden">
          {/* Section Header */}
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                key="account-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-xs font-semibold text-muted-foreground mb-2 px-3 flex items-center gap-2"
              >
                <FiUserCheck className="h-3.5 w-3.5 flex-shrink-0" />
                <span>ACCOUNT</span>
              </motion.div>
            )}
          </AnimatePresence>

          <NavItem
            icon={<FiUser />}
            label="Profile"
            active={pathname === "/profile"}
            onClick={() => router.push("/profile")}
            color="gray"
            isCollapsed={isCollapsed}
          />
          <NavItem
            icon={<FiSettings />}
            label="Settings"
            active={pathname === "/settings"}
            onClick={() => router.push("/settings")}
            color="gray"
            isCollapsed={isCollapsed}
          />

          {/* User Profile Card */}
          <AnimatePresence mode="wait">
            {!isCollapsed && userProfile && (
              <motion.button
                key="profile-card"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push("/profile")}
                className="w-full mt-3 p-3 rounded-xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border-2 border-primary/20 hover:border-primary/40 transition-all group relative overflow-hidden"
              >
                {/* Hover Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-center gap-3 relative z-10">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-purple-600 p-0.5">
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                        {userProfile.avatar ? (
                          <img
                            src={userProfile.avatar}
                            alt={userProfile.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiUser className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                    {/* Online Indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                  </div>

                  {/* Username */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {userProfile.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      View Profile
                    </p>
                  </div>

                  {/* Arrow */}
                  <FiChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Collapsed Avatar Button */}
          <AnimatePresence mode="wait">
            {isCollapsed && userProfile && (
              <motion.button
                key="profile-avatar"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/profile")}
                className="w-full flex justify-center mt-3 relative group"
                title={userProfile.username}
              >
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-purple-600 p-0.5">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                      {userProfile.avatar ? (
                        <img
                          src={userProfile.avatar}
                          alt={userProfile.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FiUser className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                  {/* Online Indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                </div>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Logout Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className={`w-full flex items-center ${
              isCollapsed ? "justify-center" : "gap-3 px-4"
            } py-3 rounded-xl transition-all text-red-500 hover:bg-red-500/10 border-2 border-transparent hover:border-red-500/20 font-medium group mt-2 overflow-hidden`}
            title={isCollapsed ? "Logout" : ""}
          >
            <motion.div
              whileHover={{ rotate: 12 }}
              className="text-lg flex-shrink-0"
            >
              <FiLogOut />
            </motion.div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  key="logout-text"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 text-left"
                  style={{ whiteSpace: "nowrap" }}
                >
                  Logout
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Footer Info */}
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              key="footer"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 py-3 border-t border-border/50 bg-secondary/30 flex-shrink-0 overflow-hidden"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">Nocturne v1.0.0</span>
                <div className="flex items-center gap-2">
                  <a
                    href="/settings"
                    className="hover:text-primary transition-colors"
                  >
                    Help
                  </a>
                  <span>•</span>
                  <a
                    href="https://github.com/VortexDevX"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    GitHub
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
}

// Currently Reading Card Component
interface CurrentlyReadingCardProps {
  novel: CurrentlyReadingNovel;
  delay: number;
  onClick: () => void;
}

function CurrentlyReadingCard({
  novel,
  delay,
  onClick,
}: CurrentlyReadingCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-card/50 hover:bg-card border border-border/50 hover:border-primary/30 transition-all group overflow-hidden"
    >
      {/* Cover Image */}
      <div className="relative flex-shrink-0 w-12 h-16 rounded-md overflow-hidden bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-md">
        {novel.coverImage ? (
          <img
            src={novel.coverImage}
            alt={novel.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FiBookOpen className="w-6 h-6 text-primary" />
          </div>
        )}
        {/* Progress Badge */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-0.5">
          <span className="text-[10px] font-bold text-white">
            {novel.progressPercent}%
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <h4 className="font-semibold text-xs text-foreground truncate mb-1 group-hover:text-primary transition-colors">
          {novel.title}
        </h4>
        {/* Progress Bar */}
        <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden mb-1">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${novel.progressPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Ch {novel.currentChapter}/{novel.totalChapters}
        </p>
      </div>

      {/* Arrow Icon */}
      <FiChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
    </motion.button>
  );
}

// Enhanced Nav Item Component
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  badgeLoading?: boolean;
  onClick: () => void;
  color?: string;
  delay?: number;
  isCollapsed?: boolean;
}

function NavItem({
  icon,
  label,
  active,
  badge,
  badgeLoading,
  onClick,
  color = "blue",
  delay = 0,
  isCollapsed = false,
}: NavItemProps) {
  const colorMap: Record<string, string> = {
    green: "from-green-500 to-emerald-500",
    blue: "from-blue-500 to-cyan-500",
    purple: "from-purple-500 to-pink-500",
    orange: "from-orange-500 to-amber-500",
    pink: "from-pink-500 to-rose-500",
    gray: "from-gray-500 to-slate-500",
  };

  const iconColorMap: Record<string, string> = {
    green: "group-hover:text-green-500",
    blue: "group-hover:text-blue-500",
    purple: "group-hover:text-purple-500",
    orange: "group-hover:text-orange-500",
    pink: "group-hover:text-pink-500",
    gray: "group-hover:text-gray-500",
  };

  return (
    <div className="relative group/tooltip">
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay }}
        whileHover={{ x: isCollapsed ? 0 : 4 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`w-full flex items-center ${
          isCollapsed ? "justify-center" : "gap-3 px-4"
        } py-3 rounded-xl transition-all relative overflow-hidden group ${
          active
            ? "text-white shadow-lg shadow-primary/25"
            : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
        }`}
        title={isCollapsed ? label : ""}
      >
        {/* Active Background Gradient */}
        {active && (
          <motion.div
            layoutId="activeNav"
            className={`absolute inset-0 bg-gradient-to-r ${colorMap[color]}`}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}

        {/* Hover Glow Effect */}
        {active && (
          <motion.div
            className="absolute inset-0 bg-white/20 blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Icon with Animation */}
        <motion.span
          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
          transition={{ duration: 0.4 }}
          className={`text-xl flex-shrink-0 relative z-10 ${
            active ? "drop-shadow-md" : iconColorMap[color]
          } transition-colors`}
        >
          {icon}
        </motion.span>

        {/* Label */}
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              key="label"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 text-left font-semibold text-[15px] relative z-10"
              style={{ whiteSpace: "nowrap", overflow: "hidden" }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Badge */}
        {badge !== undefined && !isCollapsed && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className={`px-2 py-0.5 text-xs rounded-full font-bold relative z-10 flex-shrink-0 ${
              active
                ? "bg-white/20 text-white shadow-lg"
                : "bg-primary/15 text-primary border border-primary/20"
            }`}
          >
            {badgeLoading ? "..." : badge}
          </motion.span>
        )}

        {/* Badge Dot (when collapsed) */}
        {badge !== undefined && isCollapsed && badge > 0 && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background z-10" />
        )}

        {/* Hover Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -translate-x-full group-hover:translate-x-full duration-700" />
      </motion.button>

      {/* Tooltip when collapsed */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-popover text-popover-foreground text-sm font-medium rounded-lg shadow-xl border border-border opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label}
          {badge !== undefined && (
            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
              {badge}
            </span>
          )}
          {/* Arrow */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-popover" />
        </div>
      )}
    </div>
  );
}
