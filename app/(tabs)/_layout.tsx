import { Tabs } from "expo-router";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";



import { storage } from "@/services/storage";
import Header from "@/components/Header";

// ✅ ICON COMPONENT
function TabIcon({ name, focused }: any) {
  const anim = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(focused ? 1.15 : 1) },
      { translateY: withSpring(focused ? -6 : 0) },
    ],
    opacity: withTiming(focused ? 1 : 0.6),
  }));

  return (
    <Animated.View style={anim}>
      <Ionicons
        name={name}
        size={22}
 
        color={focused ? "#007AFF" : "#999"}
        
      />
    </Animated.View>
  );
}

// ✅ LABEL COMPONENT
function AnimatedLabel({ focused, text }: any) {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(focused ? 1 : 0.4),
    transform: [{ translateY: withSpring(focused ? 0 : 6) }],
  }));

  return (
    <Animated.Text
      style={[
        style,
        {
          fontSize: 11,
          fontWeight: "900",
          color: focused ? "blue" : "#777",
          
          marginTop: 4,
        },
      ]}
    >
      {text}
    </Animated.Text>
  );
}

export default function TabLayout() {
  // const colors = useTheme();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      const u = await storage.get("user");
      if (u) {
        const user = JSON.parse(u);
        setRole(user.role?.toLowerCase());
      }
      setLoading(false);
    };
    loadRole();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          height: 75,
          borderRadius: 20,

          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderColor: "#ddd",

          elevation: 10,
        },
      }}
    >
  
      
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: ({ focused }) => (
            <AnimatedLabel focused={focused} text="Home"  />
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} />
          ),
        }}
      />

      {/* REVIEW */}
      <Tabs.Screen
        name="manager-timesheets"
        options={{
          href:
            role === "manager" || role === "hr"
              ? "/manager-timesheets"
              : null,
          tabBarLabel: ({ focused }) => (
            <AnimatedLabel focused={focused} text="Review" />
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="checkmark-circle" focused={focused} />
          ),
        }}
      />

      {/* CENTER BUTTON */}
      <Tabs.Screen
        name="timesheets"
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <View style={{ position: "absolute", top: -20 }}>
              <Animated.View
                style={{
                  transform: [{ scale: focused ? 1.05 : 1 }],
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: "center",
                  justifyContent: "center",

                  backgroundColor: "blue",

                  elevation: 6,
                }}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </Animated.View>
            </View>
          ),
        }}
      />

      {/* HISTORY */}
      <Tabs.Screen
        name="history"
        options={{
          tabBarLabel: ({ focused }) => (
            <AnimatedLabel focused={focused} text="History" />
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="document-text" focused={focused} />
          ),
        }}
      />

      {/* SETTINGS */}
      <Tabs.Screen
        name="manage"
        options={{
          href: role === "manager" || role === "hr" ? "/manage" : null,
          tabBarLabel: ({ focused }) => (
            <AnimatedLabel focused={focused} text="Manage" />
          ),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}