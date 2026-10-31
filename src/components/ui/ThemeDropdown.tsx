"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/components/providers/ThemeProvider";
import { THEMES as themes } from "@/components/ui/ThemeChoices";

export default function ThemeDropdown() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const menuId = useId();
  const CurrentIcon = (themes.find((item) => item.value === theme) || themes[1])
    .icon;

  useLayoutEffect(() => {
    if (!isOpen) return;
    const place = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      const popup = menu.current;
      if (!anchor || !popup) return;
      const gutter = 8;
      const width = popup.offsetWidth;
      const height = popup.offsetHeight;
      const below = window.innerHeight - anchor.bottom - gutter;
      const above = anchor.top - gutter;
      const top =
        below < height && above > below
          ? anchor.top - height - gutter
          : anchor.bottom + gutter;
      setPosition({
        top: Math.max(
          gutter,
          Math.min(top, window.innerHeight - height - gutter),
        ),
        left: Math.max(
          gutter,
          Math.min(anchor.right - width, window.innerWidth - width - gutter),
        ),
      });
    };
    place();
    const active = menu.current?.querySelector<HTMLElement>(
      '[aria-checked="true"]',
    );
    active?.focus({ preventScroll: true });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !menu.current?.contains(target))
        setIsOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [isOpen]);

  const changeTheme = (value: (typeof themes)[number]["value"]) => {
    setTheme(value);
    setIsOpen(false);
    trigger.current?.focus();
    // Keep fast selections ordered without blocking the menu on network latency.
    writes.current = writes.current
      .then(() =>
        fetch("/api/user/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme: value }),
          keepalive: true,
        }),
      )
      .catch(() => {});
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            setIsOpen(true);
          }
          if (event.key === "Escape") setIsOpen(false);
        }}
        className="w-11 h-11 inline-flex items-center justify-center hover:bg-secondary rounded-lg transition-colors"
      >
        <CurrentIcon className="h-5 w-5" />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label="Choose theme"
            className="fixed z-[100] w-40 max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl p-1"
            style={position}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setIsOpen(false);
                trigger.current?.focus();
              }
              const items = Array.from(
                menu.current?.querySelectorAll<HTMLButtonElement>(
                  '[role="menuitemradio"]',
                ) || [],
              );
              const index = items.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? items.length - 1
                      : (index +
                          (event.key === "ArrowDown" ? 1 : -1) +
                          items.length) %
                        items.length;
                items[next]?.focus();
              }
            }}
          >
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={theme === value}
                onClick={() => changeTheme(value)}
                className={`w-full flex items-center gap-3 px-3 min-h-11 rounded-lg text-sm transition-colors ${theme === value ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {theme === value && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-current"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
