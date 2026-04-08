import { View, Text } from "react-native";
import { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

export default function PMS() {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
    translateY.value = withTiming(0, { duration: 600 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View className="flex-1 bg-white justify-center items-center px-6">
      <Animated.View style={animStyle} className="items-center">
        {/* TITLE */}
        <Text className="text-2xl font-extrabold text-center text-indigo-600 mb-2">
          Performance Management System
        </Text>

        {/* CARD */}
        <View className="bg-indigo-50 rounded-2xl px-6 py-5 shadow-md">
          <Text className="text-indigo-700 font-semibold text-center">
            Track performance, reviews & growth
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
