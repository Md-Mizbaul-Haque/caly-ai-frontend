import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '../../theme/theme';

export const WHEEL_ITEM_H = 48;
const SIDE_COUNT = 2;

function tones(isDark) {
  return {
    selected: { color: isDark ? '#F5F5F5' : '#1A1A1A', fontWeight: '700', fontSize: 18, opacity: 1 },
    near: { color: isDark ? '#A3A3A3' : '#8A8A8A', fontWeight: '500', fontSize: 15, opacity: 0.75 },
    far: { color: isDark ? '#A3A3A3' : '#8A8A8A', fontWeight: '400', fontSize: 14, opacity: 0.35 },
  };
}

// Memoized: re-renders only when THIS row's own props change, so a center
// move reconciles 2 rows instead of the whole column and bold shows instantly.
const WheelRow = memo(function WheelRow({ label, tone, rowValue, onSelect, tones }) {
  return (
    <View style={{ height: WHEEL_ITEM_H, justifyContent: 'center', paddingHorizontal: 4 }}>
      <Pressable
        onPress={() => onSelect(rowValue)}
        accessibilityRole="button"
        style={{
          height: WHEEL_ITEM_H - 8,
          borderRadius: 14,
          backgroundColor: 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={tones[tone]}>{label}</Text>
      </Pressable>
    </View>
  );
});

// iOS-style slot-machine column. Transparent background so nothing ever
// sits on top of the touch area. Positioning is left to the native
// snapToInterval — this component never moves the scroll in response to
// the user's own gesture, so flicks can't be fought or double-committed.
export default function WheelPicker({ data, value, onChange, testID, flex = 1 }) {
  const { isDark } = useTheme();
  const palette = useMemo(() => tones(isDark), [isDark]);
  const ref = useRef(null);
  const indexByValue = useMemo(() => {
    const m = new Map();
    data.forEach((d, i) => m.set(d.value, i));
    return m;
  }, [data]);
  const index = Math.max(0, indexByValue.get(value) ?? -1);
  const initialIndex = useRef(index);
  // Last row we settled on or scrolled to. Lets the sync effect below tell
  // outside changes (e.g. day clamped after a month switch) apart from the
  // user's own scrolling, which needs no correction.
  const lastSettled = useRef(index);
  // Row currently under the visual center — tracked live during scrolling so
  // the highlight follows the finger instantly instead of waiting for commit.
  const [center, setCenter] = useState(index);
  const centerRef = useRef(index);
  // Refs keep callbacks stable so memoized rows aren't invalidated by
  // parent re-renders. Synced in an effect (never during render).
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  function setCenterLive(i) {
    if (i !== centerRef.current) {
      centerRef.current = i;
      setCenter(i);
    }
  }

  // Mount: jump to the initial value without animation.
  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: initialIndex.current * WHEEL_ITEM_H, animated: false });
      lastSettled.current = initialIndex.current;
    }, 60);
    return () => clearTimeout(t);
  }, []);

  // Outside value changes only — e.g. day 31 clamped to 30.
  useEffect(() => {
    if (index !== lastSettled.current) {
      lastSettled.current = index;
      setCenterLive(index);
      ref.current?.scrollTo({ y: index * WHEEL_ITEM_H, animated: true });
    }
  }, [index]);

  // Adopt whichever row the column settled on. No scrollTo here on purpose:
  // the native snap already landed it, and any correction would fight momentum.
  // Safe to run twice per gesture (drag end + momentum end) — it converges.
  function settle(offsetY) {
    const i = Math.min(data.length - 1, Math.max(0, Math.round(offsetY / WHEEL_ITEM_H)));
    lastSettled.current = i;
    setCenterLive(i);
    if (data[i].value !== valueRef.current) onChangeRef.current(data[i].value);
  }

  const handleSelect = useCallback((val) => {
    const i = indexByValue.get(val);
    if (i == null) return;
    lastSettled.current = i;
    if (i !== centerRef.current) {
      centerRef.current = i;
      setCenter(i);
    }
    ref.current?.scrollTo({ y: i * WHEEL_ITEM_H, animated: true });
    if (val !== valueRef.current) onChangeRef.current(val);
  }, [indexByValue]);

  return (
    <View style={{ flex, height: WHEEL_ITEM_H * (SIDE_COUNT * 2 + 1) }}>
      <ScrollView
        ref={ref}
        testID={testID}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate="fast"
        disableIntervalMomentum
        nestedScrollEnabled
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_H * SIDE_COUNT }}
        onScroll={(e) => {
          const i = Math.min(
            data.length - 1,
            Math.max(0, Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H))
          );
          setCenterLive(i);
        }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.y)}
      >
        {data.map((d, i) => {
          const dist = Math.abs(i - center);
          const tone = i === center ? 'selected' : dist === 1 ? 'near' : 'far';
          return (
            <WheelRow
              key={String(d.value)}
              label={d.label}
              tone={tone}
              rowValue={d.value}
              onSelect={handleSelect}
              tones={palette}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
