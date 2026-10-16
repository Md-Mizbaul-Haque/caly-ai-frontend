import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Eye, EyeOff } from '../../../shared/components/ui/icons';
import { cn } from '@/lib/utils';
import AuthInput from './AuthInput';

// autoComplete/textContentType default to the SIGN-IN pair; the register and
// reset screens pass the "new password" pair so the OS offers to save a new
// credential instead of filling an old one. Get these wrong and password
// managers fill the wrong thing — the most common autofill bug on mobile.
function PasswordInput({
  value, onChangeText, placeholder = 'Enter your password', testID = 'password-input',
  autoComplete = 'current-password', textContentType = 'password', error, ...rest
}) {
  const [hidden, setHidden] = useState(true);
  return (
    <View className={cn('relative', error ? 'mb-1' : 'mb-4')}>
      <AuthInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        testID={testID}
        noMargin
        secureTextEntry={hidden}
        autoComplete={autoComplete}
        textContentType={textContentType}
        error={error}
        {...rest}
      />
      <Pressable
        onPress={() => setHidden((h) => !h)}
        testID="password-visibility"
        accessibilityRole="button"
        accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
        className="absolute right-5 top-6"
        hitSlop={12}
      >
        {hidden ? <EyeOff size={24} color="#4A4A4A" /> : <Eye size={24} color="#4A4A4A" />}
      </Pressable>
    </View>
  );
}

export default memo(PasswordInput);
