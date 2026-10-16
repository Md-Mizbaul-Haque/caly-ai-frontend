import { memo, useCallback, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';
import AuthInput from '../../../shared/components/auth/AuthInput';
import PasswordInput from '../../../shared/components/auth/PasswordInput';
import { MIN_PASSWORD_LENGTH, emailIssue, passwordIssue } from '../../../shared/utils/authFields';

function RegisterScreen({ onSubmit, onSwitchLogin, busy, online = true, prefillEmail, onBack }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(prefillEmail || '');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({});
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const touch = useCallback((field) => setTouched((t) => (t[field] ? t : { ...t, [field]: true })), []);
  const nameEmpty = name.trim().length === 0;
  const valid = !nameEmpty && !emailIssue(email) && !passwordIssue(password);
  const handleCta = useCallback(() => onSubmit(name.trim(), email.trim(), password), [onSubmit, name, email, password]);
  const focusEmail = useCallback(() => emailRef.current?.focus(), []);
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);
  return (
    <AuthScaffold
      onBack={onBack}
      title="Hello! Register now to get started."
      titleSize={28}
      ctaLabel={busy ? 'Creating…' : 'Register'}
      ctaDisabled={!valid || busy || !online}
      onCta={handleCta}
      bottomNote={
        <View className="flex-row justify-center mt-6">
          <Text className="text-[14px] text-muted-foreground">Already have an account? </Text>
          <Pressable onPress={onSwitchLogin}><Text className="text-[14px] text-primary font-medium">Login Now</Text></Pressable>
        </View>
      }
    >
      <AuthInput
        value={name}
        onChangeText={setName}
        placeholder="Name"
        autoCapitalize="words"
        testID="register-name"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={focusEmail}
        onBlur={() => touch('name')}
        error={touched.name && nameEmpty ? 'Enter your name' : null}
      />
      <AuthInput
        ref={emailRef}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        testID="register-email"
        autoComplete="email"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={focusPassword}
        onBlur={() => touch('email')}
        error={touched.email ? emailIssue(email) : null}
      />
      <PasswordInput
        ref={passwordRef}
        value={password}
        onChangeText={setPassword}
        // The 8-character rule is stated up front instead of only appearing
        // after a failed submit.
        placeholder={`Password (${MIN_PASSWORD_LENGTH}+ characters)`}
        // Short label for screen readers; the placeholder carries the hint.
        accessibilityLabel="Password"
        testID="register-password"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleCta}
        onBlur={() => touch('password')}
        error={touched.password ? passwordIssue(password) : null}
      />
    </AuthScaffold>
  );
}

export default memo(RegisterScreen);
