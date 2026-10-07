import { View } from 'react-native';
import Toast, { BaseToast } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cn } from '@/lib/utils';
// RNR sonner/toast not in nativewind registry – keep react-native-toast-message themed to f2470c via tokens + cn.

function layout(accent) {
  return function ThemedToastLayout(props) {
    return (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: accent,
          borderRadius: 14,
          height: 'auto',
          minHeight: 60,
          paddingVertical: 8,
          elevation: 6,
        }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        text1Style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}
        text2Style={{ fontSize: 12, color: '#8A8A8A' }}
      />
    );
  };
}

const toastConfig = {
  success: layout('#22C55E'),
  error: layout('#EF4444'),
  info: layout('#f2470c'),
};

export default function ThemedToast({ className }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      className={cn(className)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
    >
      <Toast topOffset={insets.top + 10} config={toastConfig} />
    </View>
  );
}
