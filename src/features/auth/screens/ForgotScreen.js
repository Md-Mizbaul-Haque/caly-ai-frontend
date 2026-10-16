import { memo, useCallback, useRef, useState } from 'react';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import AuthInput from '../../../shared/components/auth/AuthInput';
import PasswordInput from '../../../shared/components/auth/PasswordInput';
import { sanitizeCode } from '../../../shared/utils/nutrition';
import { CODE_LENGTH, MIN_PASSWORD_LENGTH, codeIssue, emailIssue, passwordIssue } from '../../../shared/utils/authFields';
import { forgotPassword, resetPassword } from '../../../shared/lib/authApi';
import { toastSuccess, toastError } from '../../../shared/utils/toast';

function ForgotScreen({ onDone, onBack }) {
  const [phase, setPhase] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState({});
  const passwordRef = useRef(null);
  const touch = useCallback((field) => setTouched((t) => (t[field] ? t : { ...t, [field]: true })), []);
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);

  const send = useCallback(async () => {
    setBusy(true);
    try {
      const data = await forgotPassword(email.trim());
      // No-SMTP mode: reset codes cannot be delivered — stay on this step.
      if (data && data.emailSent === false) {
        toastError('Email service is down', 'Password reset needs email — try again later');
        return;
      }
      toastSuccess('Code sent', 'Check your email for the reset code');
      setPhase('reset');
    } catch (e) {
      toastError('Could not send code', e.message);
    } finally {
      setBusy(false);
    }
  }, [email]);

  const reset = useCallback(async () => {
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
  }, [email, code, password, onDone]);

  if (phase === 'email') {
    const valid = !emailIssue(email);
    return (
      <AuthScaffold title="Reset your password" titleSize={28} subtitle="Enter your account email and we'll send a reset code."
        onBack={onBack}
        ctaLabel={busy ? 'Sending…' : 'Send reset code'} ctaDisabled={!valid || busy} onCta={send}>
        <AuthInput
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          testID="forgot-email"
          autoComplete="email"
          textContentType="username"
          returnKeyType="go"
          onSubmitEditing={() => { if (valid) send(); }}
          onBlur={() => touch('email')}
          error={touched.email ? emailIssue(email) : null}
        />
      </AuthScaffold>
    );
  }
  const clean = sanitizeCode(code);
  const valid = clean.length === CODE_LENGTH && !passwordIssue(password);
  return (
    <AuthScaffold title="Enter your reset code" titleSize={28} subtitle={`Code sent to ${email.trim()}`}
      // The code step backs into this screen's own email step first — only
      // the email step leaves the flow (to login via onBack).
      onBack={() => setPhase('email')}
      ctaLabel={busy ? 'Resetting…' : 'Reset password'} ctaDisabled={!valid || busy} onCta={reset}>
      <AuthInput
        value={code}
        onChangeText={(t) => setCode(sanitizeCode(t))}
        placeholder="------"
        keyboardType="numeric"
        testID="forgot-code"
        accessibilityLabel="Reset code"
        autoComplete="one-time-code"
        textContentType="one-time-code"
        maxLength={CODE_LENGTH}
        autoFocus
        returnKeyType="next"
        onSubmitEditing={focusPassword}
        onBlur={() => touch('code')}
        error={touched.code ? codeIssue(clean) : null}
      />
      <PasswordInput
        ref={passwordRef}
        value={password}
        onChangeText={setPassword}
        placeholder={`New password (${MIN_PASSWORD_LENGTH}+ chars)`}
        // Short label for screen readers; the placeholder carries the hint.
        accessibilityLabel="New password"
        testID="forgot-password"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={() => { if (valid) reset(); }}
        onBlur={() => touch('password')}
        error={touched.password ? passwordIssue(password) : null}
      />
    </AuthScaffold>
  );
}

export default memo(ForgotScreen);
