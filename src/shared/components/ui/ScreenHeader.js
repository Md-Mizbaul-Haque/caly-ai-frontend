import { Text, View } from 'react-native';

/**
 * Header for detail screens pushed on top of the (tabs) stack (Settings,
 * Weight Tracker, …). The root layout renders these full-screen without a
 * tab bar. Back navigation is the OS default only (Android hardware back,
 * iOS swipe-back via the router stack) — no in-UI back button.
 */
export default function ScreenHeader({ title, subtitle, right }) {
  return (
    <View className="flex-row items-center px-4 pt-2 pb-3">
      <View className="flex-1">
        {!!title && <Text className="text-xl font-extrabold text-ink" numberOfLines={1}>{title}</Text>}
        {!!subtitle && <Text className="text-[13px] text-muted-foreground mt-0.5" numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right || null}
    </View>
  );
}
