import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import BottomCTA from './BottomCTA';

export default function AuthScaffold({ title, titleColor = '#000', titleSize = 32, subtitle, onBack, ctaLabel, onCta, ctaDisabled, bottomNote, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-[#F2F2F2]">
      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {onBack && (
          <Pressable onPress={onBack} testID="auth-back" accessibilityRole="button"
            className="w-12 h-12 rounded-2xl border border-black/20 bg-[#F2F2F2] items-center justify-center mb-6">
            <ChevronLeft size={26} color="#1A1A1A" />
          </Pressable>
        )}
        <Text className="font-extrabold" style={{ color: titleColor, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.2) }}>{title}</Text>
        {!!subtitle && <Text className="text-[16px] text-[#6B6B6B] mt-2 mb-6">{subtitle}</Text>}
        <View className={`flex-1${subtitle ? '' : ' mt-8'}`}>{children}</View>
      </ScrollView>
      <View className="px-6" style={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
        <BottomCTA label={ctaLabel} onPress={onCta} disabled={ctaDisabled} />
        {bottomNote}
      </View>
    </View>
  );
}
