import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { X } from '../../../shared/components/ui/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomCTA from '../../../shared/components/auth/BottomCTA';
import { toastSuccess } from '../../../shared/utils/toast';
import { useTheme, useThemeClass } from '../../../shared/theme/theme';

function DiscountModal({ onAccept, onClose }) {
  const modalInsets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const themeClass = useThemeClass();
  const ink = isDark ? '#F5F5F5' : '#1A1A1A';
  // Plain-object style only (see BottomCTA): function-form style merged with
  // className is never called, so pressed state is tracked manually.
  const [pressed, setPressed] = useState(false);
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View className={`flex-1 bg-black/50 justify-end ${themeClass ?? ''}`}>
        <View className="bg-card rounded-t-3xl p-6" style={{ paddingBottom: Math.max(modalInsets.bottom, 32) + 20 }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[20px] font-bold text-ink flex-1">Want a discount? We get it.</Text>
            <Pressable onPress={onClose} testID="discount-close" accessibilityRole="button" accessibilityLabel="Close offer" hitSlop={12}
              onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} style={{ opacity: pressed ? 0.6 : 1 }}><X size={24} color={ink} /></Pressable>
          </View>
          <View className="flex-row items-center mb-2">
            <Text className="text-[16px] text-ink line-through mr-3">BDT11,000.00 per year</Text>
            <Text className="text-[18px] font-bold text-[#f2470c]">BDT2,200.00 per year</Text>
          </View>
          <View className="self-start bg-[#f2470c] rounded-full px-4 py-1 mb-3">
            <Text className="text-white text-[16px] font-bold">80% OFF</Text>
          </View>
          <Text className="text-[16px] text-ink mb-4">✓ No commitment, cancel anytime</Text>
          <BottomCTA label="Accept Offer" onPress={onAccept} testID="discount-accept" />
        </View>
      </View>
    </Modal>
  );
}

export default function PaywallScreen({ onDone }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const ink = isDark ? '#F5F5F5' : '#1A1A1A';
  const [offer, setOffer] = useState(false);
  // Plain-object styles only (see BottomCTA): pressed state tracked manually.
  const [pressedKey, setPressedKey] = useState(null);
  const pressable = (key) => ({
    onPressIn: () => setPressedKey(key),
    onPressOut: () => setPressedKey(null),
    style: { opacity: pressedKey === key ? 0.6 : 1 },
  });
  function dismiss() {
    if (!offer) setOffer(true);
    else onDone();
  }
  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 32) + 20, flexGrow: 1 }}>
      <View className="items-end px-6 pt-6">
        <Pressable onPress={dismiss} testID="paywall-close" accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}
          {...pressable('close')}>
          <X size={28} color={ink} />
        </Pressable>
      </View>
      <Text className="text-[28px] font-extrabold text-ink text-center px-8 mt-2 mb-5">Unlock Caly AI Premium to reach your goals faster.</Text>
      <View className="bg-muted mx-0 items-center justify-center" style={{ height: 220 }}>
        <Image
          source={require('../../../../assets/caly-logo.png')}
          style={{ width: 140, height: 140 }}
          resizeMode="contain"
          accessibilityLabel="Caly AI logo"
        />
      </View>
      <View className="px-6 mt-5">
        <Text className="text-[18px] font-semibold text-ink mb-4">✓ No Commitment - Cancel Anytime</Text>
        <BottomCTA label="Start 7-Day Free Trial!" onPress={onDone} testID="paywall-trial" />
        <Text className="text-center text-[14px] text-muted-foreground mt-3">7 days free, then BDT11,000.00 per year (BDT916.66/mo)</Text>
        <View className="flex-row justify-around mt-4">
          <Pressable onPress={() => toastSuccess('Privacy', 'Coming soon')} {...pressable('privacy')}><Text className="text-[15px] text-muted-foreground">Privacy</Text></Pressable>
          <Pressable onPress={() => toastSuccess('Restore', 'Coming soon')} {...pressable('restore')}><Text className="text-[15px] text-muted-foreground">Restore Purchase</Text></Pressable>
          <Pressable onPress={() => toastSuccess('Terms', 'Coming soon')} {...pressable('terms')}><Text className="text-[15px] text-muted-foreground">Terms</Text></Pressable>
        </View>
      </View>
      </ScrollView>
      {offer && <DiscountModal onAccept={onDone} onClose={onDone} />}
    </View>
  );
}
