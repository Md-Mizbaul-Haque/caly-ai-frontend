import { Pressable, Text } from 'react-native';

export default function BottomCTA({ label, onPress, disabled, testID }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID ?? 'bottom-cta'}
      accessibilityRole="button"
      className={`rounded-full items-center justify-center ${disabled ? 'bg-black/10' : 'bg-black'}`}
      style={{ height: 60 }}
    >
      <Text className={`text-[20px] font-medium ${disabled ? 'text-black/50' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}
