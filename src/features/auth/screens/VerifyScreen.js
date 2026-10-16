import { memo, useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import AuthInput from '../../../shared/components/auth/AuthInput';
import { sanitizeCode } from '../../../shared/utils/nutrition';
import { CODE_LENGTH, codeIssue } from '../../../shared/utils/authFields';

function VerifyScreen({ email, onVerify, onResend, onSkip, busy, onBack }) {
  const [code, setCode] = useState('');
  const [skipVisible, setSkipVisible] = useState(false);
  const [touched, setTouched] = useState(false);
  // The resend request is silent otherwise: without this the link stays
  // tappable while a send is in flight and repeated taps look like no-ops.
  const [resending, setResending] = useState(false);
  const clean = sanitizeCode(code);
  const codeComplete = clean.length === CODE_LENGTH;
  const handleResend = useCallback(async () => {
    if (resending) return;
    setResending(true);
    try {
      const ok = await onResend(email);
      if (ok) setSkipVisible(true);
    } finally {
      setResending(false);
    }
  }, [resending, onResend, email]);
  const handleCta = useCallback(() => { if (codeComplete) onVerify(email, clean); }, [codeComplete, onVerify, email, clean]);
  const handleSkip = useCallback(() => onSkip(email), [onSkip, email]);
  return (
    <AuthScaffold
      onBack={onBack}
      title="Almost there! Just verify your email."
      titleSize={28}
      ctaLabel={busy ? 'Verifying…' : 'Verify'}
      ctaDisabled={!codeComplete || busy}
      onCta={handleCta}
    >
      <View className="bg-card rounded-btn border border-border px-6 mb-4" style={{ height: 72, justifyContent: 'center' }}>
        <Text className="text-[17px] text-ink">{email}</Text>
      </View>
      <AuthInput
        value={code}
        onChangeText={(t) => setCode(sanitizeCode(t))}
        placeholder="------"
        keyboardType="numeric"
        testID="verify-code"
        // The placeholder is dashes; a screen reader must hear what to type.
        accessibilityLabel="Verification code"
        // Fills the code straight from the notification / Mail on both
        // platforms instead of making the user retype six digits.
        autoComplete="one-time-code"
        textContentType="one-time-code"
        maxLength={CODE_LENGTH}
        // The code is the only thing this screen wants — start there.
        autoFocus
        returnKeyType="go"
        onSubmitEditing={handleCta}
        onBlur={() => setTouched(true)}
        error={touched ? codeIssue(clean) : null}
      />
      <Pressable onPress={handleResend} disabled={resending} className="self-end mt-1" testID="verify-resend">
        <Text className="text-[16px] text-muted-foreground">{resending ? 'Sending…' : "I didn't get a code."}</Text>
      </Pressable>
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
