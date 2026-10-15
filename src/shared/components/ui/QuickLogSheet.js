import { useCallback, useEffect, useState } from 'react';
import { Animated, BackHandler, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { Camera, Scale, Plus } from './icons';
const QUICK_ACTIONS = [
  { key: 'food', label: 'Log Food', Icon: Plus },
  { key: 'scan', label: 'Scan', Icon: Camera },
  { key: 'weight', label: 'Weight', Icon: Scale },
];

/**
 * Quick-log sheet: white panel covering the nav bar (the tab bar hides
 * behind the sheet while it is open). Dismiss via the dim, an action, or
 * the nav center button's close state.
 * Core actions only: Log Food / Scan / Weight.
 */
export default function QuickLogSheet({ remaining = 0, onClose, onLogFood, onLogWeight, onScan }) {
  const [progress] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [progress]);

  const dismiss = useCallback((after) => {
    const close = after === undefined ? onClose : after;
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
      if (finished) close?.();
    });
  }, [onClose, progress]);

  // Native device back dismisses the sheet (state overlay, not a route).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, [dismiss]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });

  return (
    <View className="absolute inset-0" pointerEvents="box-none" style={{ zIndex: 30, elevation: 30 }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(26,26,26,0.45)',
          opacity: progress,
        }}
      >
        <Pressable className="flex-1" onPress={() => dismiss()} accessibilityLabel="Close quick log" />
      </Animated.View>

      <Animated.View
        className={cn('bg-card rounded-t-[24px] px-4 pt-4 pb-4 border-t border-border')}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: insets.bottom + 16,
          opacity: progress,
          transform: [{ translateY }],
          // No shadow: the panel now covers the nav area and Android
          // elevation draws on all sides, which would bleed past the
          // screen edge. The dim above is the separator.
          shadowOpacity: 0,
        }}
      >
        <View className="flex-row" style={{ gap: 12 }}>
          {QUICK_ACTIONS.map(({ key, label, Icon }) => (
            <Pressable
              key={key}
              onPress={() => dismiss(key === 'food' ? onLogFood : key === 'scan' ? onScan : onLogWeight)}
              accessibilityLabel={label}
              className={cn('flex-1 bg-primary rounded-2xl py-3 items-center')}
            >
               <Icon size={20} color="#FFFFFF" />
              <Text className={cn('text-primary-foreground text-xs font-semibold mt-1.5')}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <View className={cn('mt-3 bg-muted rounded-2xl px-4 py-2.5')}>
          <Text className={cn('text-muted-foreground text-xs text-center')}>{remaining} kcal remaining today</Text>
        </View>
      </Animated.View>
    </View>
  );
}
