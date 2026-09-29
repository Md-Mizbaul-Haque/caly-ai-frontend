import { View, Text } from 'react-native';
export default function MacroBar({ label, grams, target, color = '#22C55E' }) {
  const pct = Math.min(100, Math.round((Math.max(grams,0) / Math.max(target,1)) * 100));
  return (
    <View className="mb-2">
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm text-ink">{label}</Text>
        <Text className="text-sm text-muted">{grams}g / {target}g</Text>
      </View>
      <View className="h-2 bg-[#F1E8E0] rounded-full overflow-hidden">
        <View style={{ width: `${pct}%`, backgroundColor: color }} className="h-2 rounded-full" />
      </View>
    </View>
  );
}
