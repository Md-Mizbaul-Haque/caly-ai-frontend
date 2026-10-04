import { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Beef, Droplet, Flame, Trash, Wheat } from '../ui/icons';
import { formatTime } from '../../utils/format';
const tokens = require('../../theme/tokens.js');

const MACROS = [
  { key: 'protein', label: 'Protein', color: '#FF6B35', Icon: Beef },
  { key: 'carbs', label: 'Carbs', color: '#FACC15', Icon: Wheat },
  { key: 'fat', label: 'Fat', color: '#22C55E', Icon: Droplet },
];

export default function MealRow({ meal, onDelete }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(meal.imageUrl) && !imageFailed;
  return (
    <View className="bg-white rounded-card p-3 flex-row border border-[#F1E8E0]" style={{ shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
      <View className="w-16 h-16 rounded-2xl overflow-hidden bg-cream border border-[#F1E8E0] items-center justify-center mr-3">
        {showImage ? (
          <Image
            source={{ uri: meal.imageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text className="text-2xl">{meal.emoji || '🍽️'}</Text>
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
              <Trash size={14} color={tokens.colors.muted} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>
        <View className="flex-row items-center mt-0.5">
          <Flame size={14} color={tokens.colors.primary} strokeWidth={2.5} fill={tokens.colors.primary} />
          <Text className="text-sm font-semibold text-ink ml-1">
            {Math.max(Number(meal.kcal) || 0, 0)} <Text className="font-normal text-muted">Calories</Text>
          </Text>
        </View>
        <View className="flex-row flex-wrap mt-1.5" style={{ gap: 6 }}>
          {MACROS.map(({ key, label, color, Icon }) => (
            <View key={key} className="flex-row items-center bg-white border border-[#F1E8E0] rounded-full px-2 py-0.5">
              <Icon size={12} color={color} strokeWidth={2.5} />
              <Text className="text-[10px] font-semibold text-ink ml-1">
                {Number(meal[key]) || 0}g <Text className="font-normal text-muted">{label}</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
