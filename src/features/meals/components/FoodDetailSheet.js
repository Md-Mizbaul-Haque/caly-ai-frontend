import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Minus, Plus, X, Flame, Beef, Wheat, Droplet } from '../../../shared/components/ui/icons';
import Chip from '../../../shared/components/ui/Chip';
import CachedImage from '../../../shared/components/image/CachedImage';
import PrimaryButton from '../../../shared/components/ui/Button';
import { scaleByFactor, clampGrams, defaultMealType } from '../../../shared/utils/foodScale';
import { useTheme, useThemeClass } from '../../../shared/theme/theme';

const TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const GRAM_STEP = 50;
const SERVING_STEP = 0.5;

/**
 * Food detail bottom sheet: photo + macros, quantity control with
 * live-scaled totals, meal-type chips, Add button -> onAdd(meal payload).
 * Modes: 'grams' (catalog food, values per 100g) or 'servings' (a previously
 * logged meal, values are that serving — multiplier 0.5x steps).
 * Same Animated dock pattern as QuickLogSheet (no extra dependency).
 * Rendered in a full-screen Modal so it overlays the BottomNav (the screen
 * content area ends at the top of the nav, so an absolute view inside the
 * screen can never cover the nav).
 */
export default function FoodDetailSheet({ food, mode = 'grams', onClose, onAdd }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const themeClass = useThemeClass();
  const [progress] = useState(() => new Animated.Value(0));
  const [amount, setAmount] = useState(mode === 'grams' ? 100 : 1);
  const [type, setType] = useState(() => defaultMealType(new Date().getHours()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [progress]);

  function dismiss(after = onClose) {
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
      if (finished) after?.();
    });
  }

  const scaled = useMemo(
    () => (mode === 'grams' ? scaleByFactor(food, amount / 100) : scaleByFactor(food, amount)),
    [food, amount, mode],
  );
  const isGrams = mode === 'grams';

  function bump(delta) {
    setAmount((a) => (isGrams ? clampGrams(a + delta) : Math.min(20, Math.max(0.5, Math.round((a + delta) * 10) / 10))));
  }

  function onAmountText(v) {
    const n = Number(String(v).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(n)) return;
    setAmount(isGrams ? clampGrams(n) : Math.min(20, Math.max(0.5, n)));
  }

  async function handleAdd() {
    setSaving(true);
    setError(null);
    try {
      await onAdd({
        name: food.name,
        kcal: scaled.kcal,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fat: scaled.fat,
        mealType: type,
        ...(food.imageUrl ? { imageUrl: food.imageUrl } : {}),
      });
      dismiss();
    } catch (e) {
      setError(e.message || 'Could not log this food. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const macros = [
    { Icon: Flame, value: `${scaled.kcal}`, unit: 'kcal' },
    { Icon: Beef, value: `${scaled.protein}g`, unit: 'protein' },
    { Icon: Wheat, value: `${scaled.carbs}g`, unit: 'carbs' },
    { Icon: Droplet, value: `${scaled.fat}g`, unit: 'fat' },
  ];

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => dismiss()}>
      <View className={`flex-1 ${themeClass ?? ''}`} pointerEvents="box-none">
        <Animated.View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(26,26,26,0.45)', opacity: progress,
          }}
        >
          <Pressable className="flex-1" onPress={() => dismiss()} accessibilityLabel="Close food details" />
        </Animated.View>

        <Animated.View
          className="bg-card rounded-t-[24px] border-t border-border"
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%',
            paddingBottom: Math.max(insets.bottom, 0),
            opacity: progress, transform: [{ translateY }],
          }}
        >
        <ScrollView className="px-4 pt-3 pb-6">
          <View className="items-center mb-2">
            <View className="w-10 h-1 rounded-full bg-muted" />
          </View>
          <View className="flex-row items-start justify-between mb-3">
            <Text className="text-xl font-bold text-ink flex-1 mr-2">{food.name}</Text>
            <Pressable onPress={() => dismiss()} accessibilityLabel="Close" hitSlop={8}>
              <X size={22} color={isDark ? '#F5F5F5' : '#1A1A1A'} />
            </Pressable>
          </View>

          {food.imageUrl ? (
            <View className="rounded-card overflow-hidden mb-3" style={{ height: 170 }}>
              <CachedImage uri={food.imageUrl} className="w-full h-full" resizeMode="cover" />
            </View>
          ) : null}

          <View className="flex-row mb-4" style={{ gap: 8 }}>
            {macros.map(({ Icon, value, unit }) => (
              <View key={unit} className="flex-1 bg-input rounded-xl items-center py-2">
                <Icon size={16} color={isDark ? '#F5F5F5' : '#1A1A1A'} />
                <Text className="font-bold text-ink text-sm mt-1">{value}</Text>
                <Text className="text-muted-foreground text-[11px]">{unit}</Text>
              </View>
            ))}
          </View>

          <Text className="text-xs text-muted-foreground mb-2">
            {isGrams ? 'Quantity (catalog values are per 100g)' : 'Servings (as you logged it before)'}
          </Text>
          <View className="flex-row items-center mb-4" style={{ gap: 12 }}>
            <Pressable
              onPress={() => bump(isGrams ? -GRAM_STEP : -SERVING_STEP)}
              accessibilityLabel="Decrease quantity"
              className="w-11 h-11 rounded-full bg-input items-center justify-center"
            >
              <Minus size={20} color={isDark ? '#F5F5F5' : '#1A1A1A'} />
            </Pressable>
            <View className="flex-row items-center flex-1 bg-input rounded-xl px-3">
              <TextInput
                value={isGrams ? String(amount) : String(amount).replace(/\.0$/, '')}
                onChangeText={onAmountText}
                keyboardType="numeric"
                className="flex-1 py-2.5 text-center font-bold text-ink"
                accessibilityLabel={isGrams ? 'Grams' : 'Servings'}
              />
              <Text className="text-muted-foreground text-sm">{isGrams ? 'g' : '×'}</Text>
            </View>
            <Pressable
              onPress={() => bump(isGrams ? GRAM_STEP : SERVING_STEP)}
              accessibilityLabel="Increase quantity"
              className="w-11 h-11 rounded-full bg-input items-center justify-center"
            >
              <Plus size={20} color={isDark ? '#F5F5F5' : '#1A1A1A'} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12, paddingVertical: 2 }} className="mb-4">
            {TYPES.map((t) => (
              <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />
            ))}
          </ScrollView>

          {error ? <Text className="text-red-500 mb-2">{error}</Text> : null}
          <PrimaryButton
            title={saving ? 'Adding…' : `Add ${scaled.kcal} kcal to today`}
            disabled={saving}
            onPress={handleAdd}
          />
          {saving ? <ActivityIndicator className="mt-3" /> : null}
        </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
