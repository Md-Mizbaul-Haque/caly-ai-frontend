import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from '../../../shared/components/ui/icons';
import BottomCTA from './BottomCTA';
import { useCompactAuth } from './useCompact';

export default function AuthScaffold({ title, titleColor = '#1A1A1A', titleSize = 32, subtitle, onBack, ctaLabel, onCta, ctaDisabled, ctaBorderRadius = 999, bottomNote, children }) {
  const insets = useSafeAreaInsets();
  const compact = useCompactAuth();
  // Plain-object style only (see BottomCTA): a function-form style merged
  // with className is never called, so pressed state is tracked manually.
  const [backPressed, setBackPressed] = useState(false);
  // Bottom action area (CTA + switch link) is a normal flex footer above the
  // system nav: [scrollable content] -> [flexible space] -> [CTA] -> [note] ->
  // [insets.bottom + theme spacing] -> [system nav]. No absolute positioning.
  // iOS uses KAV padding; Android relies on the default adjustResize window
  // shrink (KAV "height" would shrink twice and push the footer under the
  // keyboard/nav), so behavior stays undefined there.
  // On short screens the chrome tightens (existing scale values only) so the
  // primary input stays visible without scrolling.
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View className="flex-1 bg-white">
        <ScrollView
          className={`flex-1 px-6 ${compact ? 'pt-4' : 'pt-6'}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: compact ? 8 : 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {onBack && (
            <Pressable onPress={onBack} testID="auth-back" accessibilityRole="button" accessibilityLabel="Go back"
              onPressIn={() => setBackPressed(true)}
              onPressOut={() => setBackPressed(false)}
              className={`w-12 h-12 rounded-2xl border border-[#F1E8E0] bg-white items-center justify-center ${compact ? 'mb-4' : 'mb-6'}`}
              style={{ opacity: backPressed ? 0.6 : 1 }}>
              <ChevronLeft size={26} color="#1A1A1A" />
            </Pressable>
          )}
          <Text className="font-extrabold" style={{ color: titleColor, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.2) }}>{title}</Text>
          {!!subtitle && <Text className="text-[16px] text-[#8A8A8A] mt-2 mb-6">{subtitle}</Text>}
          <View className={`flex-1${subtitle ? '' : ' mt-8'}`}>{children}</View>
        </ScrollView>
        {/* Grouped bottom action area: CTA + switch link stay together, always
            above the system navigation via device inset + theme spacing
            (same footer pattern as the onboarding screens: p-8 fallback + p-5). */}
        <View className="px-6" style={{ paddingBottom: Math.max(insets.bottom, 32) + 20 }}>
          <BottomCTA label={ctaLabel} onPress={onCta} disabled={ctaDisabled} borderRadius={ctaBorderRadius} />
          {bottomNote}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
