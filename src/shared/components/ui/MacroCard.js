import { View, Text } from 'react-native';
import ProgressRing from './ProgressRing';

export default function MacroCard({ label, grams = 0, target = 1, color, icon: Icon, style }) {
  const safeTarget = Math.max(Number(target) || 0, 1);
  const safeGrams = Math.max(Number(grams) || 0, 0);
  return (
    <View className="bg-white rounded-card p-3 border border-[#F1E8E0]" style={[{ shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }, style]}>
      <View className="flex-row items-baseline">
        <Text className="text-base font-bold text-ink">{safeGrams}</Text>
        <Text className="text-xs text-muted"> /{safeTarget}g</Text>
      </View>
      <Text className="text-xs font-medium text-muted mt-0.5 mb-2">{label}</Text>
      <View className="items-center">
        <ProgressRing eaten={safeGrams} goal={safeTarget} size={54} strokeWidth={6} color={color}>
          <Icon size={18} color={color} strokeWidth={2} />
        </ProgressRing>
      </View>
    </View>
  );
}
