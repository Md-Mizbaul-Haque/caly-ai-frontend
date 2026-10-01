import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Card from '../components/ui/Card';
import PrimaryButton from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import { register, login, verifyEmail, resendCode, forgotPassword, resetPassword } from '../lib/authApi';
import { toastSuccess, toastError } from '../utils/toast';

const MODES = ['login', 'register', 'verify', 'forgot', 'reset'];

export default function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn, okMsg) {
    setBusy(true);
    try {
      const data = await fn();
      if (data && data.token) {
        toastSuccess('Welcome', okMsg);
        onAuthed(data.user);
      } else {
        toastSuccess('Check email', okMsg);
        if (mode === 'register') setMode('verify');
        if (mode === 'forgot') setMode('reset');
      }
    } catch (e) {
      toastError('Auth failed', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-cream px-4 pt-16">
      <Text className="text-2xl font-bold text-ink mb-4">Caly AI — Sign in</Text>
      <View className="flex-row mb-3" style={{ gap: 8 }}>
        {MODES.map(m => <Chip key={m} label={m} active={mode === m} onPress={() => setMode(m)} />)}
      </View>
      <Card>
        {mode === 'register' && (
          <TextInput value={name} onChangeText={setName} placeholder="Name" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        )}
        <TextInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        {(mode === 'login' || mode === 'register' || mode === 'reset') && (
          <TextInput value={password} onChangeText={setPassword} placeholder={mode === 'reset' ? 'New password (8+ chars)' : 'Password (8+ chars)'} secureTextEntry className="bg-cream rounded-xl px-3 py-2 mb-2" />
        )}
        {(mode === 'verify' || mode === 'reset') && (
          <TextInput value={code} onChangeText={setCode} placeholder="6-digit code" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        )}
        {mode === 'login' && <PrimaryButton title={busy ? 'Signing in…' : 'Login'} disabled={busy || !email || !password} onPress={() => run(() => login(email.trim(), password), 'Signed in')} />}
        {mode === 'register' && <PrimaryButton title={busy ? 'Creating…' : 'Register'} disabled={busy || !name.trim() || !email || password.length < 8} onPress={() => run(() => register(name.trim(), email.trim(), password), 'Code sent — verify email')} />}
        {mode === 'verify' && <PrimaryButton title={busy ? 'Verifying…' : 'Verify'} disabled={busy || !email || code.trim().length !== 6} onPress={() => run(() => verifyEmail(email.trim(), code.trim()), 'Verified')} />}
        {mode === 'forgot' && <PrimaryButton title={busy ? 'Sending…' : 'Send reset code'} disabled={busy || !email} onPress={() => run(() => forgotPassword(email.trim()), 'Reset code sent')} />}
        {mode === 'reset' && <PrimaryButton title={busy ? 'Resetting…' : 'Reset password'} disabled={busy || !email || code.trim().length !== 6 || password.length < 8} onPress={() => run(() => resetPassword(email.trim(), code.trim(), password), 'Password reset')} />}
        {mode === 'verify' && <View className="mt-2"><PrimaryButton title="Resend code" disabled={busy || !email} onPress={() => run(() => resendCode(email.trim()), 'Code resent')} /></View>}
        {mode === 'login' && <Text className="text-muted text-xs mt-2">Unverified login returns 403 + auto resend — check email, then use verify tab.</Text>}
      </Card>
    </ScrollView>
  );
}
