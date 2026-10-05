import { useRef } from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { dateKey } from '../../utils/format';
import ProgressRing from '../ui/ProgressRing';
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildDays(reference) {
  const day = reference.getDate();
  const weekStart = new Date(reference.getFullYear(), reference.getMonth(), day - reference.getDay());
  const weekEnd = new Date(reference.getFullYear(), reference.getMonth(), day - reference.getDay() + 6);
  const early = new Date(reference.getFullYear(), reference.getMonth(), day - 3);
  const late = new Date(reference.getFullYear(), reference.getMonth(), day + 3);
  const start = early < weekStart ? early : weekStart;
  const end = late > weekEnd ? late : weekEnd;
  const count = Math.round((end - start) / 86400000) + 1;
  return Array.from({ length: count }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export default function DaySelector({ selected, onSelect, totalsByDate = {}, goal = 2000 }) {
  const today = new Date();
  const todayKey = dateKey(today);
  const days = buildDays(today);
  const selectedKey = dateKey(selected);
  const scrollRef = useRef(null);
  const containerWidth = useRef(0);
  const itemLayout = useRef({});
  const didInit = useRef(false);

  function scrollToKey(key, animated) {
    const scroller = scrollRef.current;
    const item = itemLayout.current[key];
    if (!scroller || !item || !containerWidth.current) return;
    // Center the day: offset item center to container center, clamped at 0.
    const target = Math.max(0, item.x + item.w / 2 - containerWidth.current / 2);
    scroller.scrollTo({ x: target, animated });
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={e => {
        containerWidth.current = e.nativeEvent.layout.width;
        if (!didInit.current) {
          didInit.current = true;
          scrollToKey(selectedKey, false);
        }
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
            onPress={() => {
              onSelect(d);
              scrollToKey(key, true);
            }}
            onLayout={e => {
              itemLayout.current[key] = { x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width };
              if (key === selectedKey && didInit.current) scrollToKey(key, false);
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