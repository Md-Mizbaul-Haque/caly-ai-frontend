import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomCTA from '../../../shared/components/auth/BottomCTA';
import { toastSuccess } from '../../../shared/utils/toast';

function DiscountModal({ onAccept, onClose }) {
  const modalInsets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl p-6" style={{ paddingBottom: Math.max(modalInsets.bottom, 32) + 20 }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[20px] font-bold text-[#1A1A1A] flex-1">Want a discount? We get it.</Text>
            <Pressable onPress={onClose} testID="discount-close" hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><X size={24} color="#1A1A1A" /></Pressable>
          </View>
          <View className="flex-row items-center mb-2">
            <Text className="text-[16px] text-[#1A1A1A] line-through mr-3">BDT11,000.00 per year</Text>
            <Text className="text-[18px] font-bold text-[#f2470c]">BDT2,200.00 per year</Text>
          </View>
          <View className="self-start bg-[#f2470c] rounded-full px-4 py-1 mb-3">
            <Text className="text-white text-[16px] font-bold">80% OFF</Text>
          </View>
          <Text className="text-[16px] text-[#1A1A1A] mb-4">✓ No commitment, cancel anytime</Text>
          <BottomCTA label="Accept Offer" onPress={onAccept} testID="discount-accept" />
        </View>
      </View>
    </Modal>
  );
}

export default function PaywallScreen({ onDone }) {
  const insets = useSafeAreaInsets();
  const [offer, setOffer] = useState(false);
  function dismiss() {
    if (!offer) setOffer(true);
    else onDone();
  }
  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 32) + 20, flexGrow: 1 }}>
      <View className="items-end px-6 pt-6">
        <Pressable onPress={dismiss} testID="paywall-close" accessibilityRole="button" hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <X size={28} color="#1A1A1A" />
        </Pressable>
      </View>
      <Text className="text-[28px] font-extrabold text-[#1A1A1A] text-center px-8 mt-2 mb-5">Unlock SnapCalorie Premium to reach your goals faster.</Text>
      <View className="bg-[#F1E8E0] mx-0 items-center justify-center" style={{ height: 220 }}>
        <Text className="text-[16px] text-[#8A8A8A]">Premium meals photo</Text>
      </View>
      <View className="px-6 mt-5">
        <Text className="text-[18px] font-semibold text-[#1A1A1A] mb-4">✓ No Commitment - Cancel Anytime</Text>
        <BottomCTA label="Start 7 day free trial!" onPress={onDone} testID="paywall-trial" />
        <Text className="text-center text-[14px] text-[#8A8A8A] mt-3">7 days free, then BDT11,000.00 per year (BDT916.66/mo)</Text>
        <View className="flex-row justify-around mt-4">
          <Pressable onPress={() => toastSuccess('Privacy', 'Coming soon')} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-[15px] text-[#8A8A8A]">Privacy</Text></Pressable>
          <Pressable onPress={() => toastSuccess('Restore', 'Coming soon')} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-[15px] text-[#8A8A8A]">Restore Purchase</Text></Pressable>
          <Pressable onPress={() => toastSuccess('Terms', 'Coming soon')} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-[15px] text-[#8A8A8A]">Terms</Text></Pressable>
        </View>
      </View>
      </ScrollView>
      {offer && <DiscountModal onAccept={onDone} onClose={onDone} />}
    </View>
  );
}
