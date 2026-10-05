import { useRef } from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { dateKey } from '../../utils/format';
import ProgressRing from '../ui/ProgressRing';
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
  const scrollRef = useRef(null);
  const containerWidth = useRef(0);
  const itemX = useRef({});

  function scrollToKey(key) {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const x = itemX.current[key];
    if (x == null) return;
    // Center selected day: offset item center to container center, clamped at 0.
    const target = Math.max(0, x - containerWidth.current / 2 + 26);
    scroller.scrollTo({ x: target, animated: true });
  }
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={e => {
        containerWidth.current = e.nativeEvent.layout.width;
        scrollToKey(selectedKey);
      }}
      contentContainerStyle={{ gap: 8, paddingVertical: 2, flexGrow: 1, justifyContent: 'center' }}
    >
      {days.map(d => {
        const key = dateKey(d);
        const isSelected = key === selectedKey;
        const isToday = key === todayKey;
        const eaten = (totalsByDate[key] && totalsByDate[key].eaten) || 0;
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(d)}
            onLayout={e => {
              itemX.current[key] = e.nativeEvent.layout.x;
              if (key === selectedKey) scrollToKey(key);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${DAY_LABELS[d.getDay()]} ${d.getDate()}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}
            accessibilityState={{ selected: isSelected }}
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
                color={isSelected ? '#FFFFFF' : '#f2470c'}
                trackColor={isSelected ? 'rgba(255,255,255,0.35)' : '#F1E8E0'}
              />
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
