import { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays } from '../../../shared/components/ui/icons';
import BottomCTA from '../../../shared/components/auth/BottomCTA';
import BackButton from '../../../shared/components/auth/BackButton';
import WheelPicker, { WHEEL_ITEM_H } from '../../../shared/components/auth/WheelPicker';
import { useCompactAuth } from '../../../shared/components/auth/useCompact';
import { useOnboarding } from '../OnboardingContext';
import { calcAge } from '../../../shared/utils/nutrition';
import { PRIMARY } from '../../../shared/theme/colors';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MIN_YEAR = 1930;
const MAX_YEAR = 2015;

function daysInMonth(year, month1) {
  return new Date(year, month1, 0).getDate();
}

function BirthdayScreen({ onNext, onBack }) {
  const insets = useSafeAreaInsets();
  const compact = useCompactAuth();
  const { state, update, savePartial } = useOnboarding();
  const [saving, setSaving] = useState(false);
  const d = state.birthDate;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const setParts = useCallback((ny, nm, nd) => {
    const dim = daysInMonth(ny, nm);
    update({ birthDate: new Date(ny, nm - 1, Math.min(nd, dim)) });
  }, [update]);

  const monthData = useMemo(() => MONTHS.map((label, i) => ({ value: i + 1, label })), []);
  const dayData = useMemo(
    () => Array.from({ length: daysInMonth(y, m) }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
    [y, m]
  );
  const yearData = useMemo(
    () => Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => ({ value: MIN_YEAR + i, label: String(MIN_YEAR + i) })),
    []
  );
  const valid = calcAge(state.birthDate) >= 13;
  // Persist immediately like the other steps. Pass the Date object itself:
  // savePartial stores the patch verbatim in local state, and JSON.stringify
  // converts the Date to ISO on the wire. A pre-stringified ISO here would
  // overwrite the Date in memory and crash getFullYear on next render.
  const advance = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const ok = await savePartial({ birthDate: state.birthDate });
      if (ok) onNext();
    } finally {
      setSaving(false);
    }
  }, [saving, savePartial, state.birthDate, onNext]);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className={`flex-1 px-6 ${compact ? 'pt-4' : 'pt-6'}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
      >
        {!!onBack && (
          <View className="items-start">
            <BackButton onPress={onBack} />
          </View>
        )}
        <View className={`items-center ${compact ? 'mt-1 mb-2' : 'mt-2 mb-3'}`}>
          <View className="w-24 h-24 rounded-3xl bg-accent items-center justify-center">
            <CalendarDays size={46} color={PRIMARY} />
          </View>
        </View>
        <Text
          className="font-extrabold text-ink text-center"
          style={{ fontSize: 32, lineHeight: 38 }}
        >
          Enter your birth date
        </Text>
        <Text className={`text-center text-[16px] text-muted-foreground mt-2 ${compact ? 'mb-3' : 'mb-5'}`}>Don&apos;t worry, we&apos;ll keep it private.</Text>
        <View style={{ height: WHEEL_ITEM_H * 5 }}>
          {/* Fixed selection band, like a native picker: bolted to the middle,
              never moves, never intercepts touches (no elevation + pointer
              events disabled so swipes always reach the columns underneath). */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', top: WHEEL_ITEM_H * 2, left: 0, right: 0,
              height: WHEEL_ITEM_H, justifyContent: 'center',
            }}
          >
            <View className="bg-accent" style={{ height: WHEEL_ITEM_H - 8, borderRadius: 14 }} />
          </View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', top: WHEEL_ITEM_H * 2, left: 0, right: 0,
              height: WHEEL_ITEM_H, flexDirection: 'row', alignItems: 'center',
            }}
          >
            <View style={{ flex: 1.4 }} />
            <View className="bg-border" style={{ width: 1, height: 24 }} />
            <View style={{ flex: 0.7 }} />
            <View className="bg-border" style={{ width: 1, height: 24 }} />
            <View style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <WheelPicker testID="birth-month" data={monthData} value={m} onChange={(v) => setParts(y, v, day)} flex={1.4} />
            <WheelPicker testID="birth-day" data={dayData} value={Math.min(day, dayData.length)} onChange={(v) => setParts(y, m, v)} flex={0.7} />
            <WheelPicker testID="birth-year" data={yearData} value={Math.min(MAX_YEAR, Math.max(MIN_YEAR, y))} onChange={(v) => setParts(v, m, day)} flex={1} />
          </View>
        </View>
        {!valid && (
          <Text className="text-center text-[13px] font-medium text-primary mt-3">
            You must be at least 13 years old to use Caly AI.
          </Text>
        )}
      </ScrollView>
      <View className="px-6" style={{ paddingBottom: Math.max(insets.bottom, 32) + 20 }}>
        <BottomCTA label={saving ? 'Saving…' : 'Next'} onPress={advance} disabled={!valid || saving} testID="bottom-cta" />
      </View>
    </View>
  );
}

export default memo(BirthdayScreen);
