import { Pressable, Text } from 'react-native';
export default function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} className={`px-4 py-2 rounded-full mr-2 ${active ? 'bg-primary' : 'bg-white border border-[#F1E8E0]'}`}>
      <Text className={`text-sm ${active ? 'text-white font-bold' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}
