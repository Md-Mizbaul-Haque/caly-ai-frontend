import { Pressable, Text, View } from 'react-native';

export default function UnitToggle({ options, value, onChange, testID = 'unit-toggle' }) {
  return (
    <View testID={testID} className="self-center flex-row bg-[#F1E8E0] rounded-full p-1 mb-8">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            accessibilityRole="button"
            className={`px-8 py-2 rounded-full ${active ? 'bg-[#FF6B35]' : 'bg-transparent'}`}
            style={({ pressed }) => [
              { opacity: pressed ? 0.7 : 1 },
              active ? { elevation: 2, shadowColor: '#FF6B35', shadowOpacity: 0.25, shadowRadius: 4 } : null,
            ]}
          >
            <Text className={`text-[18px] ${active ? 'text-white font-medium' : 'text-[#8A8A8A]'}`}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
