import { Stack } from "expo-router";
import PMSHeader from "@/components/PMSHeader";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        header: () => <PMSHeader />,
      }}
    />
  );
}
