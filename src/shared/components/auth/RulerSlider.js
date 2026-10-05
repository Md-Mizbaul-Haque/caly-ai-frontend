import { memo, useEffect, useMemo, useRef } from 'react';
import { Dimensions, ScrollView, Text, View } from 'react-native';
import { snapToStep } from '../../utils/nutrition';

const TICK_W = 12;

// Memoized: tick rows are static, so parent re-renders during a swipe skip
// all ~450 of them and only the display number updates.
const Tick = memo(function Tick({ major, label }) {
  return (
    <View style={{ width: TICK_W }} className="items-center">
      <View style={{ width: 2, height: major ? 40 : 22, backgroundColor: '#1A1A1A' }} />
      {major && <Text className="text-[11px] text-[#8A8A8A] mt-1">{label}</Text>}
    </View>
  );
});

export default function RulerSlider({ min, max, step, value, onChange, testID = 'ruler' }) {
  const ref = useRef(null);
  const count = Math.floor((max - min) / step) + 1;
  const ticks = useMemo(
    () => Array.from({ length: count }, (_, i) => min + i * step),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, step]
  );
  const safeValue = Math.min(max, Math.max(min, value ?? min));
  const halfWidth = Dimensions.get('window').width / 2;

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  // Key of the last value we committed or synced to. The sync effect below
  // only moves the scroll for OUTSIDE changes (mount, unit switch) — never
  // for the user's own drag, so it can't fight momentum.
  const lastCommittedKey = useRef(null);
  const lastIndexRef = useRef(-1);

  function commitIndex(i) {
    const clamped = Math.min(count - 1, Math.max(0, i));
    lastIndexRef.current = clamped;
    const v = snapToStep(min + clamped * step, min, step);
    lastCommittedKey.current = `${min}|${step}|${v}`;
    onChangeRef.current(v);
  }

  function settle(offsetX) {
    commitIndex(Math.round(offsetX / TICK_W));
  }

  useEffect(() => {
    const key = `${min}|${step}|${safeValue}`;
    if (lastCommittedKey.current !== key) {
      lastCommittedKey.current = key;
      const idx = Math.min(count - 1, Math.max(0, Math.round((safeValue - min) / step)));
      lastIndexRef.current = idx;
      ref.current?.scrollTo({ x: idx * TICK_W, animated: false });
    }
  }, [safeValue, min, step, count]);

  return (
    <View testID={testID}>
      <View className="items-center mb-2">
        <View style={{ width: 3, height: 56, backgroundColor: '#f2470c', borderRadius: 2 }} />
      </View>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TICK_W}
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: halfWidth }}
        onScroll={(e) => {
          const i = Math.min(
            count - 1,
            Math.max(0, Math.round(e.nativeEvent.contentOffset.x / TICK_W))
          );
          if (i !== lastIndexRef.current) commitIndex(i);
        }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
        onScrollEndDrag={(e) => settle(e.nativeEvent.contentOffset.x)}
      >
        {ticks.map((t, i) => {
          const major = i % 10 === 0;
          return <Tick key={String(t)} major={major} label={major ? t : null} />;
        })}
      </ScrollView>
    </View>
  );
}
