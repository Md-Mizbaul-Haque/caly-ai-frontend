import { ScrollView, Pressable, Text, View } from 'react-native';
import { dateKey } from '../../utils/format';
import ProgressRing from '../ui/ProgressRing';
const tokens = require('../../theme/tokens.js');

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildWeek(reference) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() - reference.getDay());
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default function DaySelector({ selected, onSelect, totalsByDate = {}, goal = 2000 }) {
  const today = new Date();
  const days = buildWeek(today);
  const todayKey = dateKey(today);
  const selectedKey = dateKey(selected);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {days.map(d => {
        const key = dateKey(d);
        const isSelected = key === selectedKey;
        const isToday = key === todayKey;
        const eaten = (totalsByDate[key] && totalsByDate[key].eaten) || 0;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(d)}
            className={`items-center rounded-card px-3 py-2 min-w-[44px] ${
              isSelected ? 'bg-primary' : isToday ? 'bg-white border border-[#F1E8E0]' : 'bg-transparent'
            }`}
          >
            <Text className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>{DAY_LABELS[d.getDay()]}</Text>
            <Text className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-ink'}`}>{d.getDate()}</Text>
            <View className="mt-1.5">
              <ProgressRing
                eaten={eaten}
                goal={goal}
                size={36}
                strokeWidth={4}
                color={isSelected ? '#FFFFFF' : tokens.colors.primary}
                trackColor={isSelected ? 'rgba(255,255,255,0.35)' : tokens.colors.border}
              />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
