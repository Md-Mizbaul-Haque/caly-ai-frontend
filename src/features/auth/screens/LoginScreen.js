import { memo, useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import AuthInput from '../../../shared/components/auth/AuthInput';
import PasswordInput from '../../../shared/components/auth/PasswordInput';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginScreen({ onSubmit, onForgot, onSwitchRegister, busy, online = true, prefillEmail, onBack }) {
  const [email, setEmail] = useState(prefillEmail || '');
  const [password, setPassword] = useState('');
  const valid = EMAIL_RE.test(email.trim()) && password.length > 0;
  const handleCta = useCallback(() => onSubmit(email.trim(), password), [onSubmit, email, password]);
  return (
    <AuthScaffold
      onBack={onBack}
      title="Welcome back! Good to see you again!"
      titleSize={28}
      ctaLabel={busy ? 'Signing in…' : 'Login'}
      ctaDisabled={!valid || busy || !online}
      onCta={handleCta}
      bottomNote={
        <View className="flex-row justify-center mt-6">
          <Text className="text-[14px] text-muted-foreground">Don&apos;t have an account? </Text>
          <Pressable onPress={onSwitchRegister}><Text className="text-[14px] text-primary font-medium">Register Now</Text></Pressable>
        </View>
      }
    >
      <AuthInput value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" testID="login-email" />
      <PasswordInput value={password} onChangeText={setPassword} placeholder="Enter your password" testID="login-password" />
      <Pressable onPress={onForgot} className="self-end mt-1 "><Text className="text-[16px] text-muted-foreground">Forgot Password?</Text></Pressable>
    </AuthScaffold>
  );
}

export default memo(LoginScreen);
