import { memo, useState } from 'react';
import { Pressable, Text } from 'react-native';

function BottomCTA({ label, onPress, disabled, testID, borderRadius = 999 }) {
  // NOTE: Pressable `style` must stay a plain object here. A function-form
  // style combined with className gets merged into a style array whose nested
  // function React Native never calls, silently dropping height/borderRadius
  // (button collapsed to 27px with square corners). Pressed state is tracked
  // manually so every style stays a static object on all platforms.
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID ?? 'bottom-cta'}
      accessibilityRole="button"
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={`items-center justify-center ${disabled ? 'bg-muted' : 'bg-primary'}`}
      style={[{ height: 68, borderRadius, opacity: pressed && !disabled ? 0.85 : 1 }]}
    >
      <Text className={`text-[20px] font-medium ${disabled ? 'text-muted-foreground' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}

export default memo(BottomCTA);
