import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomCTA from './BottomCTA';
import { useCompactAuth } from './useCompact';
import { useTheme } from '../../theme/theme';

export default function AuthScaffold({ title, titleColor, titleSize = 32, subtitle, ctaLabel, onCta, ctaDisabled, ctaBorderRadius = 999, bottomNote, children }) {
  const insets = useSafeAreaInsets();
  const compact = useCompactAuth();
  const { isDark } = useTheme();
  const resolvedTitleColor = titleColor ?? (isDark ? '#F5F5F5' : '#1A1A1A');
  // Bottom action area (CTA + switch link) is a normal flex footer above the
  // system nav: [scrollable content] -> [flexible space] -> [CTA] -> [note] ->
  // [insets.bottom + theme spacing] -> [system nav]. No absolute positioning.
  // iOS uses KAV padding; Android relies on the default adjustResize window
  // shrink (KAV "height" would shrink twice and push the footer under the
  // keyboard/nav), so behavior stays undefined there.
  // On short screens the chrome tightens (existing scale values only) so the
  // primary input stays visible without scrolling.
  // Back navigation is the OS default only (Android hardware back, iOS
  // swipe-back via the router stack) — no in-UI back button.
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View className="flex-1 bg-background">
        <ScrollView
          className={`flex-1 px-6 ${compact ? 'pt-4' : 'pt-6'}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: compact ? 8 : 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="font-extrabold" style={{ color: resolvedTitleColor, fontSize: titleSize, lineHeight: Math.round(titleSize * 1.2) }}>{title}</Text>
          {!!subtitle && <Text className="text-[16px] text-muted-foreground mt-2 mb-6">{subtitle}</Text>}
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
