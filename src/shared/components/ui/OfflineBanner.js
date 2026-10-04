import { Text, View } from 'react-native';
import { useIsOnline } from '../../lib/useIsOnline';

export default function OfflineBanner() {
  const online = useIsOnline();
  if (online) return null;
  return (
    <View className="bg-black px-4 py-2" testID="offline-banner">
      <Text className="text-white text-center text-[14px]">You&apos;re offline. Connect to the internet and try again.</Text>
    </View>
  );
}
