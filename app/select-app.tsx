import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
// import { BlurView } from "expo-blur";

export default function SelectApp() {
  const router = useRouter();

  // 🔥 PRESS ANIMATION (FIXED)
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);

  const pressIn1 = () => (scale1.value = withSpring(0.95));
  const pressOut1 = () => (scale1.value = withSpring(1));

  const pressIn2 = () => (scale2.value = withSpring(0.95));
  const pressOut2 = () => (scale2.value = withSpring(1));

  const style1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
  }));

  const style2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
  }));

  // 🔥 ENTRY ANIMATION
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    translateY.value = withTiming(0, { duration: 600 });
  }, []);

  const containerAnim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <LinearGradient
      colors={["#EEF2FF", "#DBEAFE"]}
      style={styles.container}
    >
      <Animated.View style={[styles.wrapper, containerAnim]}>
        <View style={styles.glassCard}>
          
          {/* TITLE */}
          <Text style={styles.title}>Choose Your Workspace</Text>
          <Text style={styles.subtitle}>
            Select where you want to continue
          </Text>

          {/* TIMEFLOW */}
          <Animated.View style={[styles.card, style1]}>
            <Pressable
              onPress={() => router.replace("/(tabs)")}
              onPressIn={pressIn1}
              onPressOut={pressOut1}
              style={styles.pressable}
            >
              <View>
                <Text style={[styles.appName, { color: "#1E3A8A" }]}>
                  Timeflow
                </Text>
                <Text style={styles.appDesc}>
                  Manage timesheets & projects
                </Text>
              </View>

              <View style={styles.iconWrap}>
                <Ionicons name="time-outline" size={26} color="#2563EB" />
              </View>
            </Pressable>
          </Animated.View>

          {/* PMS */}
          <Animated.View style={[styles.card, style2]}>
            <Pressable
              onPress={() => router.replace("/pms")}
              onPressIn={pressIn2}
              onPressOut={pressOut2}
              style={styles.pressable}
            >
              <View>
                <Text style={[styles.appName, { color: "#3730A3" }]}>
                  PMS
                </Text>
                <Text style={styles.appDesc}>
                  Performance & reviews system
                </Text>
              </View>

              <View style={styles.iconWrap}>
                <Ionicons name="analytics-outline" size={26} color="#6366F1" />
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  wrapper: {
    width: "100%",
    alignItems: "center",
  },

 glassCard: {
  width: "90%",
  borderRadius: 28,
  padding: 24,
  backgroundColor: "#ffffff", // ✅ solid instead of blur

  shadowColor: "#1e3a8a",
  shadowOpacity: 0.2,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 10,
},

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#3730A3",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 28,
    marginTop: 6,
  },

  card: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
  },

  pressable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },

  appName: {
    fontSize: 18,
    fontWeight: "800",
  },

  appDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  iconWrap: {
    backgroundColor: "rgba(255,255,255,0.6)",
    padding: 10,
    borderRadius: 14,
  },
});