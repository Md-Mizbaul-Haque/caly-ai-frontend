import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useIsOnline } from '../../lib/useIsOnline';

export default function OfflineBanner({ className }) {
  const online = useIsOnline();
  if (online) return null;
  return (
    <View className={cn('bg-foreground px-4 py-2', className)} testID="offline-banner">
      <Text className={cn('text-background text-center text-[14px]')}>You&apos;re offline. Connect to the internet and try again.</Text>
    </View>
  );
}
