import { useState } from 'react';
import AuthScaffold from '../shared/components/auth/AuthScaffold';
import AuthInput from '../shared/components/auth/AuthInput';
import PasswordInput from '../shared/components/auth/PasswordInput';
import { sanitizeCode } from '../shared/utils/nutrition';
import { forgotPassword, resetPassword } from '../shared/lib/authApi';
import { toastSuccess, toastError } from '../shared/utils/toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotScreen({ onBack, onDone }) {
  const [phase, setPhase] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    try {
      await forgotPassword(email.trim());
      toastSuccess('Code sent', 'Check your email for the reset code');
      setPhase('reset');
    } catch (e) {
      toastError('Could not send code', e.message);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      await resetPassword(email.trim(), sanitizeCode(code), password);
      toastSuccess('Password reset', 'Please sign in with your new password');
      onDone(email.trim());
    } catch (e) {
      toastError('Reset failed', e.message);
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'email') {
    const valid = EMAIL_RE.test(email.trim());
    return (
      <AuthScaffold title="Reset your password" subtitle="Enter your account email and we'll send a reset code." onBack={onBack}
        ctaLabel={busy ? 'Sending…' : 'Send reset code'} ctaDisabled={!valid || busy} onCta={send}>
        <AuthInput value={email} onChangeText={setEmail} placeholder="Enter your email" keyboardType="email-address" testID="forgot-email" />
      </AuthScaffold>
    );
  }
  const clean = sanitizeCode(code);
  const valid = clean.length === 6 && password.length >= 8;
  return (
    <AuthScaffold title="Enter your reset code" subtitle={`Code sent to ${email.trim()}`} onBack={onBack}
      ctaLabel={busy ? 'Resetting…' : 'Reset password'} ctaDisabled={!valid || busy} onCta={reset}>
      <AuthInput value={code} onChangeText={(t) => setCode(sanitizeCode(t))} placeholder="------" keyboardType="numeric" testID="forgot-code" />
      <PasswordInput value={password} onChangeText={setPassword} placeholder="New password (8+ chars)" testID="forgot-password" />
    </AuthScaffold>
  );
}
