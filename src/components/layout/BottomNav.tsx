"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  FiBook,
  FiCompass,
  FiClock,
  FiBookmark,
  FiSettings,
} from "react-icons/fi";

const navItems = [
  { icon: FiBook, label: "Library", path: "/library" },
  { icon: FiCompass, label: "Explore", path: "/explore" },
  { icon: FiClock, label: "Continue", path: "/continue" },
  { icon: FiBookmark, label: "Bookmarks", path: "/bookmarks" },
  { icon: FiSettings, label: "Settings", path: "/settings" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide bottom nav on reader pages and novel detail pages
  if (pathname.startsWith("/reader") || pathname.startsWith("/novel/")) {
    return null;
  }

  return (
    <nav aria-label="Main navigation" className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-col items-center justify-center flex-1 py-2 px-1"
            >
              {isActive && (
                <div
                  className="absolute inset-0 bg-primary/10 rounded-2xl"
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
