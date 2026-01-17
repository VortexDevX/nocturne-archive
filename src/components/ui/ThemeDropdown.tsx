"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { motion, AnimatePresence } from "framer-motion";
import { FiSun, FiMoon, FiMonitor, FiZapOff } from "react-icons/fi";
import toast from "react-hot-toast";

const themes = [
  { value: "light", label: "Light", icon: FiSun },
  { value: "dark", label: "Dark", icon: FiMoon },
  { value: "night", label: "Night", icon: FiZapOff },
  { value: "amoled", label: "AMOLED", icon: FiMonitor },
] as const;

export default function ThemeDropdown() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTheme = themes.find((t) => t.value === theme) || themes[1];
  const CurrentIcon = currentTheme.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleThemeChange = async (
    newTheme: (typeof themes)[number]["value"]
  ) => {
    try {
      setUpdating(true);

      // Update UI immediately
      setTheme(newTheme);
      setIsOpen(false);

      // Update database preferences in background
      const res = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: newTheme }),
      });

      const data = await res.json();

      if (!data.success) {
        console.error("Failed to update theme preference:", data.message);
        // Don't show error to user, theme is already changed in UI
      }
    } catch (error) {
      console.error("Failed to update theme preference:", error);
      // Don't show error to user, theme is already changed in UI
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-secondary rounded-lg transition-colors relative"
        aria-label="Change theme"
        disabled={updating}
      >
        <CurrentIcon className="h-5 w-5" />
        {updating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-40 bg-card border-2 border-border rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              const isActive = theme === themeOption.value;

              return (
                <button
                  key={themeOption.value}
                  onClick={() => handleThemeChange(themeOption.value)}
                  disabled={updating}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors disabled:opacity-50 ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {themeOption.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-current" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
