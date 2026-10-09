import { useRef } from 'react';
import { ScrollView, Pressable, Text, View } from 'react-native';
import { dateKey } from '../../utils/format';
import { weekRange, zonedParts } from '../../utils/mealDates';
import ProgressRing from '../ui/ProgressRing';
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseYmd(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

// The Sun..Sat calendar week containing `reference` in `timeZone` — the
// same window fetchWeek loads, so every visible day has backing data.
// Noon-anchored UTC instants keep DST transitions from slipping the date.
function buildDays(reference, timeZone) {
  const { from } = weekRange(reference, timeZone);
  const start = parseYmd(from);
  if (!start) return [];
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(Date.UTC(start.y, start.m - 1, start.d + i, 12));
    return { date: t, key: dateKey(t, timeZone) };
  });
}

export default function DaySelector({ selected, onSelect, totalsByDate = {}, goal = 2000, timeZone }) {
  const today = new Date();
  const todayKey = dateKey(today, timeZone);
  const days = buildDays(selected || today, timeZone);
  const selectedKey = dateKey(selected, timeZone);
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
      {days.map(({ date: d, key }) => {
        const isSelected = key === selectedKey;
        const isToday = key === todayKey;
        const eaten = (totalsByDate[key] && totalsByDate[key].eaten) || 0;
        const parts = zonedParts(d, timeZone);
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
            accessibilityLabel={`${DAY_LABELS[parts.weekday]} ${parts.d}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}
            accessibilityState={{ selected: isSelected }}
            className={`items-center rounded-card px-3 py-2 min-w-[44px] ${
              isSelected ? 'bg-primary' : isToday ? 'bg-white border border-[#F1E8E0]' : 'bg-transparent'
            }`}
          >
            <Text className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>{DAY_LABELS[parts.weekday]}</Text>
            <Text className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : 'text-ink'}`}>{parts.d}</Text>
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
