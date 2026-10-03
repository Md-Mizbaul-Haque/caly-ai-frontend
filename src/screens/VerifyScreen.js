import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthScaffold from '../components/auth/AuthScaffold';
import AuthInput from '../components/auth/AuthInput';
import { sanitizeCode } from '../utils/nutrition';

export default function VerifyScreen({ email, onBack, onVerify, onResend, onSkip, busy }) {
  const [code, setCode] = useState('');
  const [skipVisible, setSkipVisible] = useState(false);
  const clean = sanitizeCode(code);
  function handleResend() {
    onResend(email);
    setSkipVisible(true);
  }
  return (
    <AuthScaffold
      title="Almost there! Just verify your email."
      onBack={onBack}
      ctaLabel={busy ? 'Verifying…' : 'Verify'}
      ctaDisabled={clean.length !== 6 || busy}
      onCta={() => onVerify(email, clean)}
    >
      <View className="bg-white rounded-2xl border border-black/10 px-6 mb-4" style={{ height: 72, justifyContent: 'center' }}>
        <Text className="text-[17px] text-black">{email}</Text>
      </View>
      <AuthInput value={code} onChangeText={(t) => setCode(sanitizeCode(t))} placeholder="------" keyboardType="numeric" testID="verify-code" />
      <Pressable onPress={handleResend} className="self-end mt-1"><Text className="text-[16px] text-black/60">I didn&apos;t get a code.</Text></Pressable>
      {skipVisible && (
        <Pressable onPress={() => onSkip(email)} disabled={busy} testID="verify-skip" accessibilityRole="button"
          className="rounded-full items-center justify-center bg-transparent border border-black mt-4"
          style={{ height: 60, borderWidth: 1 }}>
          <Text className="text-black text-lg font-medium">Skip for now</Text>
        </Pressable>
      )}
    </AuthScaffold>
  );
}
