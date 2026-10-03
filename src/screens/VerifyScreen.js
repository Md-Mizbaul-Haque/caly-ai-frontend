import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthScaffold from '../components/auth/AuthScaffold';
import AuthInput from '../components/auth/AuthInput';
import { sanitizeCode } from '../utils/nutrition';

export default function VerifyScreen({ email, onBack, onVerify, onResend, busy }) {
  const [code, setCode] = useState('');
  const clean = sanitizeCode(code);
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
      <Pressable onPress={() => onResend(email)} className="self-end mt-1"><Text className="text-[16px] text-black/60">I didn&apos;t get a code.</Text></Pressable>
    </AuthScaffold>
  );
}
