"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  FiBook,
  FiCompass,
  FiClock,
  FiBookmark,
  FiSettings,
} from "react-icons/fi";
import { motion } from "framer-motion";

const navItems = [
  { icon: FiBook, label: "Library", path: "/library" },
  { icon: FiCompass, label: "Explore", path: "/explore" },
  { icon: FiClock, label: "Continue", path: "/continue" },
  { icon: FiBookmark, label: "Bookmarks", path: "/bookmarks" },
  { icon: FiSettings, label: "Settings", path: "/settings" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide bottom nav on reader pages and novel detail pages
  if (pathname.startsWith("/reader") || pathname.startsWith("/novel/")) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border backdrop-blur-lg bg-opacity-95">
      <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="relative flex flex-col items-center justify-center flex-1 py-2 px-1"
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute inset-0 bg-primary/10 rounded-2xl"
                  transition={{ type: "spring", duration: 0.5 }}
                />
              )}
              <Icon
                className={`h-5 w-5 mb-1 transition-colors relative z-10 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium relative z-10 ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
