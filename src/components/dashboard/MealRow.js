import { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Trash } from 'lucide-react-native';
import { formatTime } from '../../utils/format';
const tokens = require('../../theme/tokens.js');

const MACROS = [
  { key: 'protein', label: 'protein', color: '#FF6B35' },
  { key: 'carbs', label: 'carbs', color: '#FACC15' },
  { key: 'fat', label: 'fat', color: '#22C55E' },
];

export default function MealRow({ meal, onDelete }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(meal.imageUrl) && !imageFailed;
  return (
    <View className="bg-white rounded-card p-3 flex-row border border-[#F1E8E0]" style={{ shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
      <View className="w-14 h-14 rounded-btn overflow-hidden bg-cream border border-[#F1E8E0] items-center justify-center mr-3">
        {showImage ? (
          <Image
            source={{ uri: meal.imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text className="text-xl">{meal.emoji || '🍽️'}</Text>
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="flex-1 font-bold text-ink" numberOfLines={1}>
            {meal.name}
          </Text>
          <Text className="text-[11px] text-muted ml-2">{formatTime(meal.loggedAt)}</Text>
          {onDelete ? (
            <Pressable onPress={() => onDelete(meal.id)} hitSlop={8} className="ml-2">
              <Trash size={15} color={tokens.colors.muted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
        <View className="flex-row items-center mt-1">
          <Text className="text-sm">🔥</Text>
          <Text className="text-sm font-semibold text-ink ml-1">
            {Math.max(Number(meal.kcal) || 0, 0)} <Text className="font-normal text-muted">Calories</Text>
          </Text>
        </View>
        <View className="flex-row flex-wrap mt-1.5" style={{ gap: 6 }}>
          {MACROS.map(m => (
            <View key={m.key} className="flex-row items-center bg-cream rounded-full px-2 py-0.5">
              <View className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: m.color }} />
              <Text className="text-[10px] text-muted">
                {m.label} {Number(meal[m.key]) || 0}g
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
