import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function PMSTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#6366f1",
        tabBarStyle: {
          height: 60,
          paddingBottom: 6,
          borderTopWidth: 1,
          borderColor: "#e5e7eb",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
