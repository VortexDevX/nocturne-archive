"use client";

import { useState, createContext, useContext } from "react";
import DesktopSidebar from "@/components/layout/DesktopSidebar";
import BottomNav from "@/components/layout/BottomNav";
import { FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  FiBook,
  FiClock,
  FiBookmark,
  FiUser,
  FiSettings,
  FiLogOut,
  FiCompass,
  FiArchive,
  FiGrid,
} from "react-icons/fi";
import ThemeDropdown from "@/components/ui/ThemeDropdown";

const navItems = [
  {
    icon: FiClock,
    label: "Continue Reading",
    path: "/continue",
    color: "green",
  },
  { icon: FiBook, label: "Library", path: "/library", color: "blue" },
  { icon: FiCompass, label: "Explore", path: "/explore", color: "purple" },
  { icon: FiBookmark, label: "Bookmarks", path: "/bookmarks", color: "orange" },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar - Hidden on mobile/tablet */}
      <DesktopSidebar />

      {/* Tablet/Mobile Hamburger Menu Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <>
            {/* Backdrop - Simplified */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />

            {/* Sidebar - Optimized */}
            <motion.aside
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{
                type: "tween",
                duration: 0.25,
                ease: "easeOut",
              }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-gradient-to-b from-card to-background border-r border-border z-50 flex flex-col lg:hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-5 pb-4 border-b border-border bg-gradient-to-br from-primary/5 via-background to-background">
                <div className="flex items-center justify-between mb-3">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                    <FiBook className="w-7 h-7 text-primary" />
                    Nocturne
                  </h1>
                  <div className="flex items-center gap-2">
                    <ThemeDropdown />
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-2 hover:bg-secondary rounded-xl transition-colors"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Your reading sanctuary
                </p>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                <div className="text-xs font-semibold text-muted-foreground mb-3 px-3 flex items-center gap-2">
                  <FiGrid className="h-3.5 w-3.5" />
                  NAVIGATION
                </div>
                {navItems.map((item) => (
                  <MobileNavItem
                    key={item.path}
                    icon={<item.icon />}
                    label={item.label}
                    active={pathname === item.path}
                    color={item.color}
                    onClick={() => {
                      router.push(item.path);
                      setIsSidebarOpen(false);
                    }}
                  />
                ))}
              </nav>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-border bg-gradient-to-b from-transparent to-secondary/20 space-y-1.5">
                <MobileNavItem
                  icon={<FiUser />}
                  label="Profile"
                  active={pathname === "/profile"}
                  color="gray"
                  onClick={() => {
                    router.push("/profile");
                    setIsSidebarOpen(false);
                  }}
                />
                <MobileNavItem
                  icon={<FiSettings />}
                  label="Settings"
                  active={pathname === "/settings"}
                  color="gray"
                  onClick={() => {
                    router.push("/settings");
                    setIsSidebarOpen(false);
                  }}
                />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-red-500 hover:bg-red-500/10 border-2 border-transparent hover:border-red-500/20 font-medium"
                >
                  <FiLogOut className="text-lg flex-shrink-0" />
                  <span className="flex-1 text-left">Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <HamburgerContext.Provider
          value={{ toggleSidebar: () => setIsSidebarOpen(!isSidebarOpen) }}
        >
          {children}
        </HamburgerContext.Provider>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav />
    </div>
  );
}

// Optimized Mobile Nav Item Component
interface MobileNavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
  color?: string;
}

function MobileNavItem({
  icon,
  label,
  active,
  badge,
  onClick,
  color = "blue",
}: MobileNavItemProps) {
  const colorMap: Record<string, string> = {
    green: "from-green-500 to-emerald-500",
    blue: "from-blue-500 to-cyan-500",
    purple: "from-purple-500 to-pink-500",
    orange: "from-orange-500 to-amber-500",
    pink: "from-pink-500 to-rose-500",
    gray: "from-gray-500 to-slate-500",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
        active
          ? "text-white shadow-lg"
          : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
      }`}
    >
      {/* Active Background Gradient */}
      {active && (
        <div
          className={`absolute inset-0 bg-gradient-to-r ${colorMap[color]}`}
        />
      )}

      {/* Icon */}
      <span className={`text-xl flex-shrink-0 relative z-10`}>{icon}</span>

      {/* Label */}
      <span className="flex-1 text-left font-semibold text-[15px] relative z-10">
        {label}
      </span>

      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <span
          className={`px-2 py-0.5 text-xs rounded-full font-bold relative z-10 ${
            active
              ? "bg-white/20 text-white"
              : "bg-primary/15 text-primary border border-primary/20"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// Context for hamburger menu
const HamburgerContext = createContext<{ toggleSidebar: () => void }>({
  toggleSidebar: () => {},
});

export const useHamburger = () => useContext(HamburgerContext);
