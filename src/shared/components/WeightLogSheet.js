import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Keyboard, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import PrimaryButton from './ui/Button';
import { X } from './ui/icons';
import { MIN_LBS, MAX_LBS, sanitizeDecimalInput, parseWeight, isValidWeight } from '../utils/weightLog';
import { useTheme, useThemeClass } from '../theme/theme';
/**
 * Docked sheet for logging weight. Weight (lbs) is required and prefills with
 * the latest entry. The weight goal lives on the Weight Tracker screen
 * (More -> Weight Tracker, also linked from the Progress goal row) — this
 * sheet never edits it. onSave({ value }) talks to the real /api/weights
 * endpoint (same-day re-log replaces the existing entry) and must throw on
 * failure so the sheet can surface the error inline instead of guessing.
 * Same Modal dock pattern as FoodDetailSheet (no extra dependency):
 * rendered in a full-screen Modal so it overlays the BottomNav.
 */
export default function WeightLogSheet({ latestWeight = null, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const themeClass = useThemeClass();
  const [progress] = useState(() => new Animated.Value(0));
  const [weight, setWeight] = useState(latestWeight != null ? String(latestWeight) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    return () => Keyboard.dismiss();
  }, [progress]);

  function dismiss(after = onClose) {
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
      if (finished) after?.();
    });
  }

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });

  async function handleSave() {
    const value = parseWeight(weight);
    if (!isValidWeight(value)) {
      setError(`Enter a weight between ${MIN_LBS} and ${MAX_LBS} lbs.`);
      return;
    }
    const payload = { value };
    setBusy(true);
    setError(null);
    try {
      await onSave(payload);
      Keyboard.dismiss();
      dismiss();
    } catch (e) {
      setError(e.message || 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => dismiss()}>
      <View className={`flex-1 ${themeClass ?? ''}`} pointerEvents="box-none">
        <Animated.View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(26,26,26,0.45)', opacity: progress,
          }}
        >
          <Pressable className="flex-1" onPress={() => dismiss()} accessibilityLabel="Close log weight" />
        </Animated.View>

        <Animated.View
          className="bg-card rounded-t-[24px] border-t border-border"
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%',
            paddingBottom: Math.max(insets.bottom, 0),
            opacity: progress, transform: [{ translateY }],
          }}
        >
          <ScrollView className="px-4 pt-3 pb-6" keyboardShouldPersistTaps="handled">
            <View className="items-center mb-2">
              <View className="w-10 h-1 rounded-full bg-muted" />
            </View>
            <View className="flex-row items-start justify-between mb-3">
              <Text className="text-xl font-bold text-ink flex-1 mr-2">Log Weight</Text>
              <Pressable onPress={() => dismiss()} accessibilityLabel="Close" hitSlop={8}>
                <X size={22} color={isDark ? '#F5F5F5' : '#1A1A1A'} />
              </Pressable>
            </View>

            <Text className="text-xs text-muted-foreground mb-2">Weight (lbs)</Text>
            <TextInput
              value={weight}
              onChangeText={(v) => setWeight(sanitizeDecimalInput(v))}
              keyboardType="decimal-pad"
              placeholder={latestWeight != null ? String(latestWeight) : 'e.g. 132.1'}
              selectTextOnFocus
              accessibilityLabel="Weight in pounds"
              className="bg-input rounded-xl px-3 py-3 text-ink mb-4"
            />

            {error ? <Text className="text-red-500 mb-2">{error}</Text> : null}
            <PrimaryButton
              title={busy ? 'Saving…' : 'Save weight'}
              disabled={busy}
              onPress={handleSave}
            />
            {busy ? <ActivityIndicator className="mt-3" /> : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
