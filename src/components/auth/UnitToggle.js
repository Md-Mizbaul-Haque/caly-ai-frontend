import { Pressable, Text, View } from 'react-native';

export default function UnitToggle({ options, value, onChange, testID = 'unit-toggle' }) {
  return (
    <View testID={testID} className="self-center flex-row bg-black/5 rounded-full p-1 mb-8">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            accessibilityRole="button"
            className={`px-8 py-2 rounded-full ${active ? 'bg-white' : 'bg-transparent'}`}
            style={active ? { elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 } : null}
          >
            <Text className={`text-[18px] ${active ? 'text-black font-medium' : 'text-black/50'}`}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
