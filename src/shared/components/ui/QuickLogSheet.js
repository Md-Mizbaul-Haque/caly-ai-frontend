import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { Camera, Scale, Plus } from './icons';
const tokens = require('../../theme/tokens.js');

const QUICK_ACTIONS = [
  { key: 'food', label: 'Log Food', Icon: Plus },
  { key: 'scan', label: 'Scan', Icon: Camera },
  { key: 'weight', label: 'Weight', Icon: Scale },
];

/**
 * Quick-log sheet: white panel docked above the nav bar.
 * Core actions only: Log Food / Scan / Weight.
 */
export default function QuickLogSheet({ bottomOffset = 0, remaining = 0, onClose, onLogFood, onLogWeight, onScan }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [progress]);

  function dismiss(after = onClose) {
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
      if (finished) after?.();
    });
  }

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });

  return (
    <View className="absolute inset-0" pointerEvents="box-none" style={{ zIndex: 30 }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: bottomOffset,
          backgroundColor: 'rgba(26,26,26,0.45)',
          opacity: progress,
        }}
      >
        <Pressable className="flex-1" onPress={() => dismiss()} accessibilityLabel="Close quick log" />
      </Animated.View>

      <Animated.View
        className="bg-white rounded-t-[24px] px-4 pt-4 pb-4"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: bottomOffset,
          opacity: progress,
          transform: [{ translateY }],
          shadowColor: tokens.colors.ink,
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -6 },
          elevation: 12,
        }}
      >
        <View className="flex-row" style={{ gap: 12 }}>
          {QUICK_ACTIONS.map(({ key, label, Icon }) => (
            <Pressable
              key={key}
              onPress={() => dismiss(key === 'food' ? onLogFood : key === 'scan' ? onScan : onLogWeight)}
              accessibilityLabel={label}
              className="flex-1 bg-primary rounded-2xl py-3 items-center"
            >
              <Icon size={20} color="#FFFFFF" strokeWidth={2.2} />
              <Text className="text-white text-xs font-semibold mt-1.5">{label}</Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-3 bg-cream rounded-2xl px-4 py-2.5">
          <Text className="text-muted text-xs text-center">{remaining} kcal remaining today</Text>
        </View>
      </Animated.View>
    </View>
  );
}
