import { memo, useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import AuthInput from '../../../shared/components/auth/AuthInput';
import PasswordInput from '../../../shared/components/auth/PasswordInput';
import { emailIssue, loginPasswordIssue } from '../../../shared/utils/authFields';

function LoginScreen({ onSubmit, onForgot, onSwitchRegister, busy, online = true, prefillEmail, onBack }) {
  const [email, setEmail] = useState(prefillEmail || '');
  const [password, setPassword] = useState('');
  // A wrong-looking address is only worth a message once the user has left the
  // field: flagging "a" on its way to "a@b.co" mid-keystroke reads as nagging.
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const passwordRef = useRef(null);
  const valid = !emailIssue(email) && !loginPasswordIssue(password);
  const handleCta = useCallback(() => onSubmit(email.trim(), password), [onSubmit, email, password]);
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);
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
      <AuthInput
        value={email}
        onChangeText={setEmail}
        placeholder="Enter your email"
        keyboardType="email-address"
        testID="login-email"
        autoComplete="email"
        // iOS password managers key saved logins off the username field.
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={focusPassword}
        onBlur={() => setEmailTouched(true)}
        error={emailTouched ? emailIssue(email) : null}
      />
      <PasswordInput
        ref={passwordRef}
        value={password}
        onChangeText={setPassword}
        placeholder="Enter your password"
        testID="login-password"
        returnKeyType="go"
        // Enter on the last field submits, the same as tapping Login.
        onSubmitEditing={handleCta}
        onBlur={() => setPasswordTouched(true)}
        error={passwordTouched ? loginPasswordIssue(password) : null}
      />
      <Pressable onPress={onForgot} className="self-end mt-1 "><Text className="text-[16px] text-muted-foreground">Forgot Password?</Text></Pressable>
    </AuthScaffold>
  );
}

export default memo(LoginScreen);
