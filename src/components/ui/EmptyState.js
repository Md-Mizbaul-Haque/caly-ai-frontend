import { View, Text } from 'react-native';
import PrimaryButton from './Button';
export default function EmptyState({ title = 'No logs yet', cta = '+ Log food', onCta }) {
  return (
    <View className="items-center py-8">
      <Text className="text-lg font-bold text-ink mb-2">{title}</Text>
      <Text className="text-muted mb-4">Start tracking to see your progress</Text>
      {onCta ? <PrimaryButton title={cta} onPress={onCta} /> : null}
    </View>
  );
}
