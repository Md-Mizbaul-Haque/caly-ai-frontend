import { Pressable, Text } from 'react-native';
export default function PrimaryButton({ title, onPress, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} className={`rounded-btn py-3  items-center ${disabled ? 'bg-[#E5E5E5]' : 'bg-primary'}`}>
      <Text className={`font-bold ${disabled ? 'text-muted' : 'text-white'}`}>{title}</Text>
    </Pressable>
  );
}
