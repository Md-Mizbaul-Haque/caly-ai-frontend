import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthScaffold from '../components/auth/AuthScaffold';
import AuthInput from '../components/auth/AuthInput';
import PasswordInput from '../components/auth/PasswordInput';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ onBack, onSubmit, onForgot, onSwitchRegister, busy, online = true, prefillEmail }) {
  const [email, setEmail] = useState(prefillEmail || '');
  const [password, setPassword] = useState('');
  const valid = EMAIL_RE.test(email.trim()) && password.length > 0;
  return (
    <AuthScaffold
      title="Welcome back! Good to see you again!"
      titleSize={26}
      onBack={onBack}
      ctaLabel={busy ? 'Signing in…' : 'Login'}
      ctaDisabled={!valid || busy || !online}
      onCta={() => onSubmit(email.trim(), password)}
      bottomNote={
        <View className="flex-row justify-center mt-6">
          <Text className="text-[14px] text-black/60">Don&apos;t have an account? </Text>
          <Pressable onPress={onSwitchRegister}><Text className="text-[14px] text-[#2D9CDB] font-medium">Register Now</Text></Pressable>
        </View>
      }
    >
      <AuthInput value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" testID="login-email" />
      <PasswordInput value={password} onChangeText={setPassword} placeholder="Enter your password" testID="login-password" />
      <Pressable onPress={onForgot} className="self-end mt-1"><Text className="text-[16px] text-black/60">Forgot Password?</Text></Pressable>
    </AuthScaffold>
  );
}
