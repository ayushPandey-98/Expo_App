import Animated from 'react-native-reanimated';
import { View ,Text} from 'react-native';

export function HelloWave() {
  return (
    <>
    <Animated.Text
      style={{
        fontSize: 28,
        lineHeight: 32,
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      👋
    </Animated.Text>
          <View className="flex-1 items-center justify-center">
      <Text className="text-xl font-bold bg-blue-300 text-xl">
        Welcome to Nativewind!
      </Text>
    </View>
</>
  );
}
