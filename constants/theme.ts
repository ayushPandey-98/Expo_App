import { Platform } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#4da6ff"; // 👈 better for dark visibility

export const Colors = {
  light: {
    // 🔤 TEXT
    text: "#11181C",
    subText: "#6b7280",
    muted: "#9ca3af",

    // 🎨 BACKGROUND
    background: "#f8fafc", // 👈 soft white (better than pure white)
    card: "#ffffff",
    surface: "#f1f5f9",

    // 🔲 BORDERS
    border: "#e5e7eb",
    divider: "#f1f5f9",

    // 🎯 BRAND
    primary: "#6366f1",
    tint: tintColorLight,

    // 🔘 ICONS
    icon: "#687076",
    tabIconDefault: "#9ca3af",
    tabIconSelected: tintColorLight,

    // ✅ STATUS
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
  },

dark: {
  // 🔤 TEXT (soft, not pure white)
  text: "#e2e8f0",
  subText: "#94a3b8",
  muted: "#64748b",

  // 🎨 BACKGROUND (NOT too dark)
  background: "#0f172a",   // 👈 soft navy (perfect balance)
  card: "#1e293b",         // 👈 slightly elevated
  surface: "#111827",      // 👈 inner sections

  // 🔲 BORDERS (visible but subtle)
  border: "#334155",
  divider: "#1e293b",

  // 🎯 BRAND (slightly glowing)
  primary: "#6366f1",
  tint: tintColorDark,

  // 🔘 ICONS
  icon: "#94a3b8",
  tabIconDefault: "#64748b",
  tabIconSelected: "#818cf8",

  // ✅ STATUS (slightly soft tones)
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#f87171",
  info: "#60a5fa",
}
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});