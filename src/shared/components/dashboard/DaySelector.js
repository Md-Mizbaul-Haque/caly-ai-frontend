import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { dateKey } from '../../utils/format';
import { weekRange, zonedParts } from '../../utils/mealDates';
import ProgressRing from '../ui/ProgressRing';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Home week strip: exactly the Sun..Sat calendar week containing `selected`
// in `timeZone` — the same week `loadWeek` fetches, so every pill always has
// data behind it. Tap-only: no auto-select on swipe, no auto-centering, no
// retained scroll state. 7 pills, no ScrollView, so taps never get stolen
// and low-end phones mount 7 rings instead of 63.
export default function DaySelector({
  selected,
  onSelect,
  totalsByDate = {},
  goal = null,
  timeZone,
  recenterSignal, // accepted for compat, intentionally ignored (no auto-center)
}) {
  void recenterSignal;
  const safeSelected = selected instanceof Date && !Number.isNaN(selected.getTime()) ? selected : new Date();
  const todayKey = dateKey(new Date(), timeZone);
  const selectedKey = dateKey(safeSelected, timeZone);

  const weekDays = useMemo(() => {
    const { from } = weekRange(safeSelected, timeZone);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from || '');
    if (!m) return [];
    const y = +m[1];
    const mo = +m[2];
    const d0 = +m[3];
    const out = [];
    for (let i = 0; i < 7; i += 1) {
      const t = new Date(Date.UTC(y, mo - 1, d0 + i, 12));
      out.push({ date: t, key: dateKey(t, timeZone) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey, timeZone]);

  function shiftWeek(deltaDays) {
    const base = safeSelected instanceof Date ? safeSelected : new Date();
    const next = new Date(base.getTime() + deltaDays * 24 * 60 * 60 * 1000);
    onSelect?.(next);
  }

  const weekLabel = useMemo(() => {
    if (weekDays.length !== 7) return '';
    const first = weekDays[0];
    const last = weekDays[6];
    const fp = zonedParts(first.date, timeZone);
    const lp = zonedParts(last.date, timeZone);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fm = months[new Date(first.key + 'T12:00:00Z').getUTCMonth()] ?? '';
    const lm = months[new Date(last.key + 'T12:00:00Z').getUTCMonth()] ?? '';
    void fp;
    void lp;
    return fm === lm ? `${fm} ${first.key.slice(8)} – ${last.key.slice(8)}` : `${fm} ${first.key.slice(8)} – ${lm} ${last.key.slice(8)}`;
  }, [weekDays, timeZone]);

  return (
    <View>
      <View className="flex-row items-center justify-between mb-2">
        <Pressable
          onPress={() => shiftWeek(-7)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          className="px-3 py-2 rounded-card border border-[#F1E8E0] bg-white"
        >
          <Text className="text-base font-bold text-ink">‹</Text>
        </Pressable>
        <Text className="text-sm font-semibold text-muted-foreground">{weekLabel}</Text>
        <Pressable
          onPress={() => shiftWeek(7)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Next week"
          className="px-3 py-2 rounded-card border border-[#F1E8E0] bg-white"
        >
          <Text className="text-base font-bold text-ink">›</Text>
        </Pressable>
      </View>

      <View className="flex-row" style={{ gap: 6 }}>
        {weekDays.map(({ date: d, key }) => {
          const isSelected = key === selectedKey;
          const isToday = key === todayKey;
          const eaten = (totalsByDate[key] && totalsByDate[key].eaten) || 0;
          const parts = zonedParts(d, timeZone);
          return (
            <Pressable
              key={key}
              onPress={() => onSelect?.(d)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${DAY_LABELS[parts.weekday]} ${parts.d}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}
              accessibilityState={{ selected: isSelected }}
              className={`flex-1 items-center rounded-card px-1 py-2 min-w-[40px] ${
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
      </View>
    </View>
  );
}
