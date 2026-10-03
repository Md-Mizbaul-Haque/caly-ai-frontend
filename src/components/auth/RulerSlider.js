import { useEffect, useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { snapToStep } from '../../utils/nutrition';

const TICK_W = 12;

export default function RulerSlider({ min, max, step, value, onChange, testID = 'ruler' }) {
  const ref = useRef(null);
  const count = Math.floor((max - min) / step) + 1;
  const ticks = Array.from({ length: count }, (_, i) => min + i * step);
  const safeValue = Math.min(max, Math.max(min, value ?? min));
  useEffect(() => {
    ref.current?.scrollTo({ x: ((safeValue - min) / step) * TICK_W, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View testID={testID}>
      <View className="items-center mb-2">
        <View style={{ width: 3, height: 56, backgroundColor: '#2D9CDB', borderRadius: 2 }} />
      </View>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={TICK_W}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 160 }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / TICK_W);
          onChange(snapToStep(min + idx * step, min, step));
        }}
      >
        {ticks.map((t, i) => {
          const major = i % 10 === 0;
          return (
            <View key={t} style={{ width: TICK_W }} className="items-center">
              <View style={{ width: 2, height: major ? 40 : 22, backgroundColor: '#1A1A1A' }} />
              {major && <Text className="text-[11px] text-black/40 mt-1">{t}</Text>}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
