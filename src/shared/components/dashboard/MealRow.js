import { useState } from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Beef, Droplet, Flame, Trash, Wheat } from '../ui/icons';
import { formatTime } from '../../utils/format';
const MACROS = [
  { key: 'protein', label: 'Protein', color: '#f2470c', Icon: Beef },
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
          {meal.count > 1 ? (
            <View className="ml-1.5 bg-primary/10 rounded-full px-1.5 py-0.5">
              <Text className="text-[10px] font-bold text-primary">×{meal.count}</Text>
            </View>
          ) : null}
          <Text className="text-[11px] text-muted-foreground ml-2">{formatTime(meal.loggedAt)}</Text>
          {onDelete ? (
            <Pressable onPress={() => onDelete(meal.id)} hitSlop={8} className="ml-2">
               <Trash size={14} color={'#8A8A8A'} />
            </Pressable>
          ) : null}
        </View>
        <View className="flex-row items-center mt-0.5">
           <Flame size={14} color={'#f2470c'} fill={'#f2470c'} />
          <Text className="text-sm font-semibold text-ink ml-1">
            {Math.max(Number(meal.kcal) || 0, 0)} <Text className="font-normal text-muted-foreground">Calories</Text>
          </Text>
        </View>
        <View className="flex-row flex-wrap mt-1.5" style={{ gap: 6 }}>
          {MACROS.map(({ key, label, color, Icon }) => (
            <View key={key} className="flex-row items-center bg-white border border-[#F1E8E0] rounded-full px-2 py-0.5">
               <Icon size={12} color={color} />
              <Text className="text-[10px] font-semibold text-ink ml-1">
                {Number(meal[key]) || 0}g <Text className="font-normal text-muted-foreground">{label}</Text>
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
