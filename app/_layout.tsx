import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  useFocusEffect,
} from "@react-navigation/native";

import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import "../global.css";

import { useCallback, useEffect, useState } from "react";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Header from "@/components/Header";

import { storage } from "@/services/storage";
import api from "@/services/api";

export default function RootLayout() {
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // ✅ LOAD USER (FAST + SAFE)
  const loadUser = async () => {
    try {
      // 🔹 1. Load from storage (instant)
      const stored = await storage.get("user");

      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }

      // 🔹 2. Always stop loading after storage
      setLoading(false);

      // 🔹 3. Background refresh (no blocking)
      const res = await api.get("/api/auth/me");

      setUser(res.data);
      await storage.set("user", JSON.stringify(res.data));
    } catch (err) {
      console.log("User load error:", err);
      setLoading(false);
    }
  };

useEffect(() => {
  const interval = setInterval(async () => {
    const stored = await storage.get("user");

    if (stored) {
      const parsed = JSON.parse(stored);

      // 🔥 only update if changed
      if (parsed?.id !== user?.id) {
        console.log("🔥 USER CHANGED DETECTED");
        setUser(parsed);
      }
    } else {
      setUser(null);
    }
  }, 500); // 🔥 check every 0.5 sec

  return () => clearInterval(interval);
}, [user]);

useEffect(() => {
  loadUser(); // initial load
}, []);

  // ✅ SYNC USER WITH STORAGE (IMPORTANT FOR LOGOUT)
  useEffect(() => {
    const syncUser = async () => {
      const stored = await storage.get("user");

      if (!stored) {
        setUser(null); // 🔥 clear memory user on logout
      }
    };

    syncUser();
  }, [pathname]);

  // ✅ HIDE HEADER ON AUTH SCREENS
  const hideHeader =
    pathname === "/(auth)/login" ||
    pathname === "/(auth)/register";

  // ✅ PREVENT EARLY RENDER
  if (loading) {
    return null;
  }

  return (
    <ThemeProvider value={theme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>

        {/* ✅ HEADER CONTROLLED PROPERLY */}
        {!hideHeader && <Header user={user} />}

        {/* ✅ ROUTES */}
        <Stack screenOptions={{ headerShown: false }} />

        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <Toast topOffset={90} />

      </SafeAreaProvider>
    </ThemeProvider>
  );
} 