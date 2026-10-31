"use client";

import { FiCheck, FiMoon, FiSun, FiMonitor, FiStar } from "react-icons/fi";

export const THEMES = [
  { value: "light", label: "Light", description: "Warm paper", icon: FiSun },
  { value: "dark", label: "Dark", description: "Soft charcoal", icon: FiMoon },
  { value: "night", label: "Night", description: "Deep navy", icon: FiStar },
  { value: "amoled", label: "AMOLED", description: "Pure black", icon: FiMonitor },
] as const;

export type ThemeName = (typeof THEMES)[number]["value"];

export default function ThemeChoices({ value, onChange }: {
  value: ThemeName;
  onChange: (theme: ThemeName) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {THEMES.map(({ value: choice, label, description, icon: Icon }) => (
        <button key={choice} type="button" aria-pressed={value === choice}
          aria-label={label} onClick={() => onChange(choice)}
          className={`theme-choice ${value === choice ? "selected" : ""}`}>
          <span className={`${choice} theme-swatch`} aria-hidden="true">
            <Icon className="h-4 w-4" /><span className="font-serif text-2xl">Aa</span>
          </span>
          <span className="flex items-center justify-between gap-2 px-3 pt-3 text-sm font-medium">
            {label}{value === choice && <FiCheck className="text-primary" />}
          </span>
          <span className="block px-3 pb-3 pt-1 text-left text-xs text-muted-foreground">{description}</span>
        </button>
      ))}
    </div>
  );
}
