import { memo, useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import AuthInput from '../../../shared/components/auth/AuthInput';
import { sanitizeCode } from '../../../shared/utils/nutrition';

function VerifyScreen({ email, onVerify, onResend, onSkip, busy }) {
  const [code, setCode] = useState('');
  const [skipVisible, setSkipVisible] = useState(false);
  const clean = sanitizeCode(code);
  const handleResend = useCallback(async () => {
    const ok = await onResend(email);
    if (ok) setSkipVisible(true);
  }, [onResend, email]);
  const handleCta = useCallback(() => onVerify(email, clean), [onVerify, email, clean]);
  const handleSkip = useCallback(() => onSkip(email), [onSkip, email]);
  return (
    <AuthScaffold
      title="Almost there! Just verify your email."
      titleSize={28}
      ctaLabel={busy ? 'Verifying…' : 'Verify'}
      ctaDisabled={clean.length !== 6 || busy}
      onCta={handleCta}
    >
      <View className="bg-card rounded-btn border border-border px-6 mb-4" style={{ height: 72, justifyContent: 'center' }}>
        <Text className="text-[17px] text-ink">{email}</Text>
      </View>
      <AuthInput value={code} onChangeText={(t) => setCode(sanitizeCode(t))} placeholder="------" keyboardType="numeric" testID="verify-code" />
      <Pressable onPress={handleResend} className="self-end mt-1"><Text className="text-[16px] text-muted-foreground">I didn&apos;t get a code.</Text></Pressable>
      {skipVisible && (
        <Pressable onPress={handleSkip} disabled={busy} testID="verify-skip" accessibilityRole="button"
          className="rounded-full items-center justify-center bg-transparent border border-border mt-4"
          style={{ height: 68, borderWidth: 1 }}>
          <Text className="text-ink text-lg font-medium">Skip for now</Text>
        </Pressable>
      )}
    </AuthScaffold>
  );
}

export default memo(VerifyScreen);
