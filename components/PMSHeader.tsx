import {
  View,
  Text,
  Pressable,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { storage } from "@/services/storage";
import { SafeAreaView } from "react-native-safe-area-context";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

export default function PMSHeader() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  // 🔥 animations
  const scale = useSharedValue(1);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const modalAnim = useSharedValue(0);

  // 🔥 load user
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await api.get("/api/auth/me");
      setUser(res.data);
      await storage.set("user", JSON.stringify(res.data));
    } catch (err) {
      console.log("User fetch error", err);
    }
  };

  // 🔥 modal animation
  useEffect(() => {
    modalAnim.value = withTiming(open ? 1 : 0, { duration: 250 });
  }, [open]);

  // 🔥 user data
  const username = user?.username || user?.name || "No Name";
  const email = user?.email || "No Email";
  const role = user?.role || "employee";

  const getInitials = (name: string, email: string) => {
    if (name && name !== "No Name") {
      const parts = name.split(" ");
      return (
        (parts[0]?.[0] || "") +
        (parts[1]?.[0] || parts[0]?.[1] || "")
      ).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(username, email);

  // 🔥 tilt animation
  const tiltStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  // 🔥 modal animation style
  const modalStyle = useAnimatedStyle(() => ({
    opacity: modalAnim.value,
    transform: [
      { translateY: withSpring(modalAnim.value ? 0 : -20) },
      { scale: withSpring(modalAnim.value ? 1 : 0.95) },
    ],
  }));

  // 🔥 press interaction
  const handlePressIn = () => {
    scale.value = withSpring(0.92);
    rotateX.value = withSpring(6);
    rotateY.value = withSpring(-6);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    rotateX.value = withSpring(0);
    rotateY.value = withSpring(0);
  };

  // 🔥 logout
  const handleLogout = async () => {
    setOpen(false);

    await storage.remove("access_token");
    await storage.remove("refresh_token");
    await storage.remove("user");

    router.replace("/(auth)/login");
  };

  if (!user) return null;

  return (
    <SafeAreaView style={{ backgroundColor: "#fff", zIndex: 1000 }}>
      
      {/* 🔥 HEADER */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        {/* LEFT */}
        <View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "900",
              color: "#111827",
            }}
          >
            PMS
          </Text>

          <Text
            style={{
              fontSize: 11,
              color: "#6b7280",
              marginTop: 2,
            }}
          >
            Performance System
          </Text>
        </View>

        {/* RIGHT */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>

  

          {/* 🔥 AVATAR */}
          <Pressable
            onPress={() => setOpen(true)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <Animated.View
              style={[
                tiltStyle,
                {
                  backgroundColor: "#6366f1",
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#6366f1",
                  shadowOpacity: 0.5,
                  shadowRadius: 10,
                  elevation: 6,
                },
              ]}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>
                {initials}
              </Text>
            </Animated.View>
          </Pressable>
        </View>
      </View>

      {/* 🔥 PROFILE MODAL */}
      <Modal transparent visible={open} animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-start",
            alignItems: "flex-end",
          }}
        >
          <Animated.View
            style={[
              modalStyle,
              {
                backgroundColor: "#fff",
                marginTop: 60,
                marginRight: 12,
                borderRadius: 20,
                width: 260,
                padding: 16,
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 10,
              },
            ]}
          >
            {/* HEADER */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700" }}>
                Profile
              </Text>

              <Pressable onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} />
              </Pressable>
            </View>

            {/* AVATAR BIG */}
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  backgroundColor: "#6366f1",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>
                  {initials}
                </Text>
              </View>
            </View>

            {/* USER INFO */}
            <Text style={{ textAlign: "center", fontWeight: "700" }}>
              {username}
            </Text>

            <Text style={{ textAlign: "center", fontSize: 12, color: "#6b7280" }}>
              {email}
            </Text>

            <Text
              style={{
                textAlign: "center",
                fontSize: 11,
                marginTop: 6,
                backgroundColor: "#eef2ff",
                color: "#6366f1",
                alignSelf: "center",
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 10,
                fontWeight: "600",
              }}
            >
              {role}
            </Text>
                    {/* 🔁 BACK TO TIMEFLOW */}
          <Pressable
            onPress={() => router.replace("/")}
            style={{
              backgroundColor: "#eef2ff",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#6366f1", fontWeight: "700", fontSize: 12 }}>
              Timeflow
            </Text>
          </Pressable>

            {/* LOGOUT */}
            <Pressable
              onPress={handleLogout}
              style={{
                marginTop: 14,
                backgroundColor: "#ef4444",
                paddingVertical: 10,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
                Logout
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}