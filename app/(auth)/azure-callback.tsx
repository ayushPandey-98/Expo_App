import { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { storage } from "@/services/storage";
import api from "@/services/api";

export default function AzureCallback() {
  useEffect(() => {
    const handleAuth = async (event: any) => {
      try {
        const url = event.url;

        console.log("CALLBACK URL from azure-callback.tsx 👉", url);

        const parsed = Linking.parse(url);

        const access = parsed.queryParams?.access;
        const refresh = parsed.queryParams?.refresh;

        if (!access) {
          throw new Error("No access token received");
        }

        if (access) await storage.set("access_token", access);
        if (refresh) await storage.set("refresh_token", refresh);

        const res = await api.get("/api/auth/me");
        await storage.set("user", JSON.stringify(res.data));

        router.replace("/(tabs)");
      } catch (err) {
        console.log("Azure login failed", err);
        router.replace("/login");
      }
    };

    const sub = Linking.addEventListener("url", handleAuth);

    Linking.getInitialURL().then((url) => {
      if (url) handleAuth({ url });
    });

    return () => sub.remove();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#215afb" />
      <Text className="mt-4 text-gray-500">Signing you in…</Text>
    </View>
  );
}
