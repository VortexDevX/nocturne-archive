"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";
import {
  FiUser,
  FiMail,
  FiLock,
  FiCamera,
  FiMenu,
  FiLogOut,
  FiBook,
  FiClock,
  FiTrendingUp,
  FiAward,
  FiZap,
  FiTarget,
} from "react-icons/fi";
import { UserStats } from "@/types";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import { useHamburger } from "../layout";
import AvatarUploadModal from "@/components/profile/AvatarUploadModal";
import EditUsernameModal from "@/components/profile/EditUsernameModal";
import EditEmailModal from "@/components/profile/EditEmailModal";
import ChangePasswordModal from "@/components/profile/ChangePasswordModal";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { toggleSidebar } = useHamburger();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [usernameModalOpen, setUsernameModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    fetchUserData();
    fetchUserStats();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.success) {
        setUser(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await fetch("/api/user/stats");
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      } else {
        console.error("Failed to fetch stats:", data.error);
        // Set default stats if API fails
        setStats({
          totalNovelsRead: 0,
          totalChaptersRead: 0,
          totalWordsRead: 0,
          hoursRead: 0,
          currentStreak: 0,
          longestStreak: 0,
          favoriteGenres: [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      // Set default stats on error
      setStats({
        totalNovelsRead: 0,
        totalChaptersRead: 0,
        totalWordsRead: 0,
        hoursRead: 0,
        currentStreak: 0,
        longestStreak: 0,
        favoriteGenres: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="md:block hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold">Profile</h2>
              <p className="text-xs text-muted-foreground">Your account</p>
            </div>
          </div>
          <ThemeDropdown />
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:block border-b border-border bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold mb-2">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account and view your reading stats
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-20 lg:pb-6">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6 lg:py-8 space-y-6">
          {/* Profile Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(120,119,198,0.1),transparent_50%)]" />

            <div className="relative p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar */}
                <div className="relative group">
                  <div className="w-28 h-28 lg:w-36 lg:h-36 rounded-full ring-4 ring-border overflow-hidden">
                    {user?.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-5xl lg:text-6xl">
                        {user?.username?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>

                  {/* Camera Overlay */}
                  <button
                    onClick={() => setAvatarModalOpen(true)}
                    className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <div className="text-center">
                      <FiCamera className="w-8 h-8 text-white mx-auto mb-1" />
                      <span className="text-white text-xs font-medium">
                        Change
                      </span>
                    </div>
                  </button>
                </div>

                {/* User Info */}
                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-3xl lg:text-4xl font-bold mb-2">
                    {user?.username || "Guest User"}
                  </h1>
                  <p className="text-muted-foreground mb-5">{user?.email}</p>

                  {/* Quick Stats */}
                  {loading ? (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 animate-pulse"
                        >
                          <div className="w-8 h-8 rounded-lg bg-secondary" />
                          <div className="w-20 h-4 rounded bg-secondary" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm">
                      <QuickStat
                        icon={<FiBook />}
                        label="Novels"
                        value={stats?.totalNovelsRead || 0}
                        color="blue"
                      />
                      <QuickStat
                        icon={<FiClock />}
                        label="Chapters"
                        value={stats?.totalChaptersRead || 0}
                        color="purple"
                      />
                      <QuickStat
                        icon={<FiTrendingUp />}
                        label="Day Streak"
                        value={stats?.currentStreak || 0}
                        color="orange"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Reading Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wide">
              Reading Statistics
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-card rounded-2xl border-2 border-border p-5 animate-pulse"
                  >
                    <div className="w-12 h-12 bg-secondary rounded-xl mb-3" />
                    <div className="h-8 bg-secondary rounded mb-2" />
                    <div className="h-4 bg-secondary rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<FiBook />}
                  label="Novels Read"
                  value={stats?.totalNovelsRead.toString() || "0"}
                  color="from-blue-500 to-cyan-500"
                />
                <StatCard
                  icon={<FiClock />}
                  label="Chapters"
                  value={stats?.totalChaptersRead.toLocaleString() || "0"}
                  color="from-purple-500 to-pink-500"
                />
                <StatCard
                  icon={<FiTrendingUp />}
                  label="Current Streak"
                  value={`${stats?.currentStreak || 0} days`}
                  color="from-orange-500 to-red-500"
                />
                <StatCard
                  icon={<FiClock />}
                  label="Hours Read"
                  value={`${stats?.hoursRead || 0}h`}
                  color="from-green-500 to-emerald-500"
                />
              </div>
            )}
          </motion.div>

          {/* Additional Stats */}
          {!loading && stats && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {/* Words Read */}
              <div className="bg-card rounded-2xl border-2 border-border p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                    <FiZap />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {(stats.totalWordsRead / 1000).toFixed(1)}K
                    </p>
                    <p className="text-xs text-muted-foreground">Words Read</p>
                  </div>
                </div>
              </div>

              {/* Longest Streak */}
              <div className="bg-card rounded-2xl border-2 border-border p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white">
                    <FiAward />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {stats.longestStreak} days
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Longest Streak
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Favorite Genres */}
          {!loading && stats && stats.favoriteGenres.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wide">
                Favorite Genres
              </h2>
              <div className="bg-card rounded-2xl border-2 border-border p-5">
                <div className="flex flex-wrap gap-3">
                  {stats.favoriteGenres.map((genre, index) => (
                    <div
                      key={genre.genre}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border-2 border-primary/20"
                    >
                      <span className="font-bold text-primary">
                        {genre.genre}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({genre.count})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Account Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wide">
              Account Settings
            </h2>
            <div className="bg-card rounded-2xl border-2 border-border divide-y divide-border overflow-hidden">
              <SettingRow
                icon={<FiUser />}
                label="Username"
                value={user?.username || "N/A"}
                onClick={() => setUsernameModalOpen(true)}
              />
              <SettingRow
                icon={<FiMail />}
                label="Email Address"
                value={user?.email || "N/A"}
                onClick={() => setEmailModalOpen(true)}
              />
              <SettingRow
                icon={<FiLock />}
                label="Password"
                value="••••••••"
                onClick={() => setPasswordModalOpen(true)}
              />
            </div>
          </motion.div>

          {/* Logout Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all font-bold border-2 border-red-500/20 hover:border-red-500/30"
            >
              <FiLogOut className="h-5 w-5" />
              Logout from Account
            </button>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AvatarUploadModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
      />
      <EditUsernameModal
        isOpen={usernameModalOpen}
        onClose={() => setUsernameModalOpen(false)}
      />
      <EditEmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
      />
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  );
}

// Quick Stat Component (for profile header)
function QuickStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-500",
    purple: "bg-purple-500/20 text-purple-500",
    orange: "bg-orange-500/20 text-orange-500",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-lg ${colorMap[color]} flex items-center justify-center text-sm`}
      >
        {icon}
      </div>
      <span className="font-medium">
        <strong className="text-foreground">{value}</strong>{" "}
        <span className="text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-card rounded-2xl border-2 border-border p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all group">
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg`}
      >
        {icon}
      </div>
      <p className="text-2xl lg:text-3xl font-bold mb-1">{value}</p>
      <p className="text-xs lg:text-sm text-muted-foreground font-medium">
        {label}
      </p>
    </div>
  );
}

// Setting Row Component
function SettingRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors group"
    >
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm text-muted-foreground mb-0.5">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
      <div className="text-muted-foreground group-hover:text-primary transition-colors">
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  );
}
