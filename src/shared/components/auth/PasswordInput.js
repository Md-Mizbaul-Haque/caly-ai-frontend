import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import AuthInput from './AuthInput';

export default function PasswordInput({ value, onChangeText, placeholder = 'Enter your password', testID = 'password-input' }) {
  const [hidden, setHidden] = useState(true);
  return (
    <View className={cn('relative mb-4')}>
      <AuthInput value={value} onChangeText={onChangeText} placeholder={placeholder} testID={testID} noMargin secureTextEntry={hidden} />
      <Pressable
        onPress={() => setHidden((h) => !h)}
        testID="password-visibility"
        accessibilityRole="button"
        className="absolute right-5 top-6"
        hitSlop={12}
      >
        {hidden ? <EyeOff size={24} color="#4A4A4A" /> : <Eye size={24} color="#4A4A4A" />}
      </Pressable>
    </View>
  );
}
