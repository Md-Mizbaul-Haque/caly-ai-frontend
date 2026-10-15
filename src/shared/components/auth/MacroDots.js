import { Text, View } from 'react-native';

export default function MacroDots({ proteinG, fatG, carbsG }) {
  const items = [
    { dot: '#F2555A', amount: `${proteinG}g`, label: 'protein' },
    { dot: '#FFB020', amount: `${fatG}g`, label: 'fat' },
    { dot: '#22D3EE', amount: `${carbsG}g`, label: 'carbs' },
  ];
  return (
    <View className="flex-row justify-around mt-4">
      {items.map((m) => (
        <View key={m.label} className="items-center">
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: m.dot }} />
          <Text className="text-[22px] font-semibold text-ink mt-2">{m.amount}</Text>
          <Text className="text-[16px] text-muted-foreground">{m.label}</Text>
        </View>
      ))}
    </View>
  );
}
