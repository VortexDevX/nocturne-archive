"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  FiArrowUpRight,
  FiBook,
  FiBookOpen,
  FiBookmark,
  FiClock,
  FiCompass,
  FiLogOut,
  FiSettings,
  FiUser,
  FiChevronsLeft,
} from "react-icons/fi";
import ThemeDropdown from "@/components/ui/ThemeDropdown";
import type { ContinueReadingItem } from "@/types";

const navigation = [
  { icon: FiBook, label: "My library", href: "/library" },
  { icon: FiClock, label: "Continue reading", href: "/continue" },
  { icon: FiCompass, label: "Discover", href: "/explore" },
  { icon: FiBookmark, label: "Saved passages", href: "/bookmarks" },
];

export default function DesktopSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [reading, setReading] = useState<ContinueReadingItem[]>([]);
  const [username, setUsername] = useState("");

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebarCollapsed") === "true");
    const controller = new AbortController();
    const desktop = window.matchMedia("(min-width: 1024px)");
    let loaded = false;
    const load = () => {
      if (!desktop.matches || loaded) return;
      loaded = true;
      void fetch("/api/reading/continue", { signal: controller.signal })
        .then((r) => r.json())
        .then((result) => {
          if (result.success) setReading(result.data.slice(0, 2));
        })
        .catch(() => {});
      void fetch("/api/auth/me", { signal: controller.signal })
        .then((r) => r.json())
        .then((result) => {
          if (result.success)
            setUsername((result.data || result.user)?.username || "Reader");
        })
        .catch(() => {});
    };
    load();
    desktop.addEventListener("change", load);
    return () => {
      controller.abort();
      desktop.removeEventListener("change", load);
    };
  }, []);

  return (
    <aside
      className="archive-sidebar hidden lg:flex flex-col"
      style={{ width: collapsed ? 80 : 248 }}
      aria-label="Library sidebar"
    >
      <div
        className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-5 pt-8 pb-7`}
      >
        <Link
          href="/library"
          className="flex items-center gap-2.5 text-primary"
          aria-label="Nocturne library"
        >
          <Image
            src="/brand/nocturne-mark-64.png"
            alt=""
            width={32}
            height={32}
            unoptimized
            className="shrink-0"
          />
          {!collapsed && (
            <span className="archive-brand">
              nocturne<span className="text-primary">.</span>
            </span>
          )}
        </Link>
      </div>
      {!collapsed && <p className="eyebrow px-6 pb-3">YOUR READING ROOM</p>}
      <nav aria-label="Main navigation" className="space-y-1 px-3">
        {navigation.map(({ icon: Icon, label, href }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            aria-label={label}
            aria-current={pathname === href ? "page" : undefined}
            className={`archive-nav-link ${collapsed ? "justify-center px-0" : ""}`}
          >
            <Icon />
            {!collapsed && <span>{label}</span>}
          </Link>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto min-h-0 px-5 mt-10">
        {!collapsed && reading.length > 0 && (
          <>
            <p className="eyebrow mb-5">ON YOUR NIGHTSTAND</p>
            <div className="space-y-5">
              {reading.map((book) => (
                <Link
                  key={book.novelId}
                  href={`/reader/${book.novelId}/${book.currentChapter}`}
                  className="block group"
                >
                  <div className="flex gap-3">
                    <div className="w-9 h-12 rounded-sm bg-primary/10 border-l-2 border-primary/50 flex items-center justify-center shrink-0">
                      <FiBookOpen className="text-primary h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium line-clamp-2 leading-relaxed group-hover:text-primary">
                        {book.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Chapter {book.currentChapter} of {book.totalChapters}
                      </p>
                    </div>
                  </div>
                  <div className="h-0.5 mt-3 bg-secondary overflow-hidden rounded-full">
                    <div
                      className="h-full bg-primary/60"
                      style={{
                        width: `${Math.min(100, book.progressPercent)}%`,
                      }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
        {!collapsed && !reading.length && (
          <div className="border-t border-border pt-6">
            <FiBookOpen className="text-primary w-6 h-6 mb-3" />
            <p className="font-serif text-lg leading-snug">
              A little quiet.
              <br />A good book.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-3">
              Your next chapter is waiting.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 text-xs text-primary mt-4"
            >
              Find your next read <FiArrowUpRight />
            </Link>
          </div>
        )}
      </div>
      <div className="border-t border-border p-3 space-y-1">
        <Link
          href="/settings"
          className={`archive-nav-link ${collapsed ? "justify-center px-0" : ""}`}
          aria-label="Settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
        >
          <FiSettings />
          {!collapsed && "Settings"}
        </Link>
        <Link
          href="/profile"
          className={`archive-nav-link ${collapsed ? "justify-center px-0" : ""}`}
          aria-label="Profile"
          aria-current={pathname === "/profile" ? "page" : undefined}
        >
          <FiUser />
          {!collapsed && (
            <span className="truncate">{username || "Your profile"}</span>
          )}
        </Link>
        <div
          className={`flex items-center ${collapsed ? "justify-center flex-col gap-2" : "justify-between px-2"} pt-3`}
        >
          <button
            className="reader-icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => {
              setCollapsed(!collapsed);
              localStorage.setItem("sidebarCollapsed", String(!collapsed));
            }}
          >
            <FiChevronsLeft className={collapsed ? "rotate-180" : ""} />
          </button>
          <ThemeDropdown />
          {!collapsed && (
            <>
              <button
                className="reader-icon"
                aria-label="Log out"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
              >
                <FiLogOut />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
