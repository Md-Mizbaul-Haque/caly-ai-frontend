import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from './icons';

/**
 * Header for detail screens pushed on top of the (tabs) stack (Settings,
 * Weight Tracker, …). The root layout renders these full-screen without a
 * tab bar, so the header owns navigation: back falls back to the dashboard
 * when there is nothing to pop (deep link / cold start on this screen).
 */
export default function ScreenHeader({ title, subtitle, right }) {
  const router = useRouter();
  const [pressed, setPressed] = useState(false);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/dashboard');
  }

  return (
    <View className="flex-row items-center px-4 pt-2 pb-3">
      <Pressable
        onPress={goBack}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={8}
        className="w-10 h-10 rounded-2xl border border-[#F1E8E0] bg-white items-center justify-center"
        style={{ opacity: pressed ? 0.6 : 1 }}
      >
        <ChevronLeft size={22} color="#1A1A1A" />
      </Pressable>
      <View className="flex-1 ml-3">
        {!!title && <Text className="text-xl font-extrabold text-ink" numberOfLines={1}>{title}</Text>}
        {!!subtitle && <Text className="text-[13px] text-muted-foreground mt-0.5" numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right || null}
    </View>
  );
}
