"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/components/providers/ThemeProvider";
import { motion } from "framer-motion";
import {
  FiDownload,
  FiBook,
  FiInfo,
  FiEdit3,
  FiMenu,
  FiLogOut,
  FiUser,
  FiCalendar,
  FiBookOpen,
  FiTrendingUp,
  FiSettings,
  FiAperture,
  FiToggleLeft,
  FiToggleRight,
  FiHeart,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import ThemeChoices from "@/components/ui/ThemeChoices";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import { useHamburger } from "@/components/layout/NavigationContext";
import toast from "react-hot-toast";
import type { UserPreferences } from "@/types";



export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { toggleSidebar } = useHamburger();

  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [libraryCount, setLibraryCount] = useState(0);

  useEffect(() => {
    fetchUserData();
    fetchPreferences();
    fetchLibraryCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json();
      if (data.success) setUser(data.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  };

  const fetchPreferences = async () => {
    try {
      setLoadingPrefs(true);
      const res = await fetch("/api/user/preferences");
      const data = await res.json();
      if (data.success) {
        setPrefs(data.data);
        if (data.data?.theme && !localStorage.getItem("theme")) {
          setTheme(data.data.theme);
        }
      }
    } catch (e) {
      console.error("Failed to fetch preferences", e);
    } finally {
      setLoadingPrefs(false);
    }
  };

  const fetchLibraryCount = async () => {
    try {
      const res = await fetch("/api/library");
      const data = await res.json();
      if (data.success) {
        setLibraryCount(data.data?.length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch library count:", error);
    }
  };

  const updatePreferences = async (update: Partial<UserPreferences>) => {
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Update failed");
      setPrefs(data.data);
      return true;
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Failed to update preferences";
      toast.error(message);
      return false;
    }
  };

  const handleTheme = async (nextTheme: UserPreferences["theme"]) => {
    setTheme(nextTheme);
    const ok = await updatePreferences({ theme: nextTheme });
    if (ok) toast.success("Theme updated");
  };

  const toggleOffline = async () => {
    if (!prefs) return;
    const ok = await updatePreferences({ offlineMode: !prefs.offlineMode });
    if (ok) {
      toast.success(
        !prefs.offlineMode ? "Offline mode enabled" : "Offline mode disabled",
      );
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const getMemberSince = () => {
    if (!user?.createdAt) return "Recently";
    const date = new Date(user.createdAt);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
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
              <h2 className="text-lg font-bold">Settings</h2>
              <p className="text-xs text-muted-foreground">
                Manage your account
              </p>
            </div>
          </div>
          <ThemeDropdown />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24 lg:pb-6">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-card border border-border"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-transparent" />

            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Avatar */}
                <div className="relative flex-shrink-0">

                  {user?.profilePicture ? (
                    <div className="relative h-24 w-24 rounded-full overflow-hidden ring-4 ring-background">
                      <Image
                        src={user.profilePicture}
                        alt={user.username}
                        fill
                        className="object-cover"
                        unoptimized
                        sizes="96px"
                      />
                    </div>
                  ) : (
                    <div className="relative h-24 w-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-3xl ring-4 ring-background">
                      {user?.username?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full border-4 border-background" />
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-1">
                    {user?.username || "Loading..."}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {user?.email || "Loading..."}
                  </p>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <FiCalendar className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Member Since
                        </p>
                        <p className="text-sm font-semibold">
                          {getMemberSince()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <FiBookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Library</p>
                        <p className="text-sm font-semibold">
                          {libraryCount} novels
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => router.push("/profile")}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
                  >
                    <FiEdit3 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors font-medium border-2 border-danger/20"
                  >
                    <FiLogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wide flex items-center gap-2">
              <FiTrendingUp className="w-4 h-4" />
              QUICK ACCESS
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  icon: FiBook,
                  label: "Reading Settings",
                  description: "Font, theme & more",
                  surface: "bg-primary/10",
                  borderColor: "border-primary/20",
                  iconColor: "text-primary",
                  onClick: () => router.push("/settings/reading"),
                },
                {
                  icon: FiDownload,
                  label: "Downloads",
                  description: "Offline content",
                  surface: "bg-primary/10",
                  borderColor: "border-success/20",
                  iconColor: "text-success",
                  onClick: () => router.push("/settings/downloads"),
                },
                {
                  icon: FiUser,
                  label: "Profile",
                  description: "Edit your info",
                  surface: "bg-primary/10",
                  borderColor: "border-primary/20",
                  iconColor: "text-primary",
                  onClick: () => router.push("/profile"),
                },
              ].map((action, idx) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={action.onClick}
                  className={`p-4 rounded-xl ${action.surface} border-2 ${action.borderColor} hover:shadow-lg transition-all group text-left`}
                >
                  <div
                    className={`p-2 rounded-lg bg-background/50 w-fit mb-3 ${action.iconColor}`}
                  >
                    <action.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                    {action.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Theme Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wide flex items-center gap-2">
              <FiAperture className="w-4 h-4" />
              APPEARANCE
            </h2>
            <ThemeChoices value={theme} onChange={handleTheme} />
          </motion.div>

          {/* Feature Toggles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wide flex items-center gap-2">
              <FiSettings className="w-4 h-4" />
              FEATURES
            </h2>
            <div className="bg-card rounded-xl border-2 border-border overflow-hidden divide-y divide-border">
              {/* Offline Mode Toggle */}
              <div className="p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        prefs?.offlineMode ? "bg-primary/10" : "bg-secondary"
                      }`}
                    >
                      <FiDownload
                        className={`w-5 h-5 ${
                          prefs?.offlineMode
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Offline Mode</p>
                      <p className="text-xs text-muted-foreground">
                        Cache chapters locally
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleOffline}
                    className="relative"
                    disabled={loadingPrefs}
                  >
                    {prefs?.offlineMode ? (
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20"
                      >
                        <FiToggleRight className="w-5 h-5" />
                        <span className="text-xs font-medium">ON</span>
                      </motion.div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground border border-border">
                        <FiToggleLeft className="w-5 h-5" />
                        <span className="text-xs font-medium">OFF</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* About Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1 uppercase tracking-wide flex items-center gap-2">
              <FiInfo className="w-4 h-4" />
              ABOUT
            </h2>
            <div className="bg-card rounded-xl border-2 border-border overflow-hidden divide-y divide-border">

              <div className="flex items-center gap-4 p-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FiInfo className="w-5 h-5 text-primary" />
                </div>
                <span className="flex-1 text-left font-medium">Version</span>
                <span className="text-sm font-mono text-muted-foreground">
                  v1.0.0
                </span>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-muted-foreground pt-4"
          >
            <p className="flex items-center justify-center gap-1">
              Made with <FiHeart className="w-4 h-4 text-danger" /> by Nocturne
              Team
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
}
