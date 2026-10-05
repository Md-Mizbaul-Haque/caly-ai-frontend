import { Pressable, Text } from 'react-native';

export default function BottomCTA({ label, onPress, disabled, testID, borderRadius = 999 }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID ?? 'bottom-cta'}
      accessibilityRole="button"
      className={`items-center justify-center ${disabled ? 'bg-[#F1E8E0]' : 'bg-primary'}`}
      style={({ pressed }) => [{ opacity: pressed && !disabled ? 0.85 : 1 }, { height: 68, borderRadius }]}
    >
      <Text className={`text-[20px] font-medium ${disabled ? 'text-[#8A8A8A]' : 'text-white'}`}>{label}</Text>
    </Pressable>
  );
}
