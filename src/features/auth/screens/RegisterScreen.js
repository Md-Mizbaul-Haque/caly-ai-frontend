import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import AuthInput from '../../../shared/components/auth/AuthInput';
import PasswordInput from '../../../shared/components/auth/PasswordInput';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ onSubmit, onSwitchLogin, busy, online = true, prefillEmail }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(prefillEmail || '');
  const [password, setPassword] = useState('');
  const valid = name.trim().length > 0 && EMAIL_RE.test(email.trim()) && password.length >= 8;
  return (
    <AuthScaffold
      title="Hello! Register now to get started."
      titleSize={26}
      ctaLabel={busy ? 'Creating…' : 'Register'}
      ctaDisabled={!valid || busy || !online}
      ctaBorderRadius={14}
      onCta={() => onSubmit(name.trim(), email.trim(), password)}
      bottomNote={
        <View className="flex-row justify-center mt-6">
          <Text className="text-[14px] text-black/60">Already have an account? </Text>
          <Pressable onPress={onSwitchLogin}><Text className="text-[14px] text-[#2D9CDB] font-medium">Login Now</Text></Pressable>
        </View>
      }
    >
      <AuthInput value={name} onChangeText={setName} placeholder="Name" autoCapitalize="words" testID="register-name" />
      <AuthInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" testID="register-email" />
      <PasswordInput value={password} onChangeText={setPassword} placeholder="Password" testID="register-password" />
    </AuthScaffold>
  );
}
