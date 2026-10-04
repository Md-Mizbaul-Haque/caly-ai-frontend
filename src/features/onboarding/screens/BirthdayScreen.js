import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays, ChevronLeft, UserRound } from 'lucide-react-native';
import BottomCTA from '../../../shared/components/auth/BottomCTA';
import WheelPicker, { WHEEL_ITEM_H } from '../../../shared/components/auth/WheelPicker';
import { useOnboarding } from '../OnboardingContext';
import { calcAge } from '../../../shared/utils/nutrition';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MIN_YEAR = 1930;
const MAX_YEAR = 2015;

function daysInMonth(year, month1) {
  return new Date(year, month1, 0).getDate();
}

export default function BirthdayScreen({ onNext, onBack }) {
  const insets = useSafeAreaInsets();
  const { state, update } = useOnboarding();
  const d = state.birthDate;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  function setParts(ny, nm, nd) {
    const dim = daysInMonth(ny, nm);
    update({ birthDate: new Date(ny, nm - 1, Math.min(nd, dim)) });
  }

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

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
      >
        {onBack && (
          <Pressable onPress={onBack} testID="auth-back" accessibilityRole="button"
            className="w-12 h-12 rounded-2xl border border-[#F1E8E0] bg-white items-center justify-center mb-2"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
            <ChevronLeft size={26} color="#1A1A1A" />
          </Pressable>
        )}
        <View className="items-center mt-2 mb-3">
          <View style={{ width: 112, height: 112, borderRadius: 30, backgroundColor: '#FFF1E9', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={52} color="#FF6B35" />
            <View style={{ position: 'absolute', top: 10, left: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' }}>
              <UserRound size={18} color="#fff" />
            </View>
          </View>
        </View>
        <Text
          className="font-extrabold text-[#1A1A1A] text-center"
          style={{ fontSize: 30, lineHeight: 36, transform: [{ rotate: '-2deg' }] }}
        >
          Enter your birth date
        </Text>
        <Text className="text-center text-[15px] text-[#8A8A8A] mt-2 mb-5">Don&apos;t worry, we&apos;ll keep it private.</Text>
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
            <View style={{ height: WHEEL_ITEM_H - 8, borderRadius: 14, backgroundColor: '#FFF1E9' }} />
          </View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', top: WHEEL_ITEM_H * 2, left: 0, right: 0,
              height: WHEEL_ITEM_H, flexDirection: 'row', alignItems: 'center',
            }}
          >
            <View style={{ flex: 1.4 }} />
            <View style={{ width: 1, height: 24, backgroundColor: '#EAD9CC' }} />
            <View style={{ flex: 0.7 }} />
            <View style={{ width: 1, height: 24, backgroundColor: '#EAD9CC' }} />
            <View style={{ flex: 1 }} />
          </View>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <WheelPicker testID="birth-month" data={monthData} value={m} onChange={(v) => setParts(y, v, day)} flex={1.4} />
            <WheelPicker testID="birth-day" data={dayData} value={Math.min(day, dayData.length)} onChange={(v) => setParts(y, m, v)} flex={0.7} />
            <WheelPicker testID="birth-year" data={yearData} value={Math.min(MAX_YEAR, Math.max(MIN_YEAR, y))} onChange={(v) => setParts(v, m, day)} flex={1} />
          </View>
        </View>
        {!valid && (
          <Text className="text-center text-[13px] font-medium text-[#FF6B35] mt-3">
            You must be at least 13 years old to use Caly AI.
          </Text>
        )}
      </ScrollView>
      <View className="px-6" style={{ paddingBottom: Math.max(insets.bottom, 32) + 20 }}>
        <BottomCTA label="Next" onPress={onNext} disabled={!valid} testID="bottom-cta" />
      </View>
    </View>
  );
}
