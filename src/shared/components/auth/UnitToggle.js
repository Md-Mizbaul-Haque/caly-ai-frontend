import { memo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PRIMARY } from '../../theme/colors';

function UnitToggle({ options, value, onChange, testID = 'unit-toggle', compact = false }) {
  // NOTE: Pressable `style` stays a plain object (see BottomCTA). A
  // function-form style merged with className is never called by React
  // Native, which silently dropped the pressed opacity and active shadow.
  const [pressedKey, setPressedKey] = useState(null);
  return (
    <View testID={testID} className={`self-center flex-row bg-muted rounded-full p-1 ${compact ? 'mb-5' : 'mb-8'}`}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPressIn={() => setPressedKey(opt)}
            onPressOut={() => setPressedKey(null)}
            className={`px-8 py-2 rounded-full ${active ? 'bg-primary' : 'bg-transparent'}`}
            style={[
              { opacity: pressedKey === opt ? 0.7 : 1 },
              active ? { elevation: 2, shadowColor: PRIMARY, shadowOpacity: 0.25, shadowRadius: 4 } : null,
            ]}
          >
            <Text className={`text-[18px] ${active ? 'text-white font-medium' : 'text-muted-foreground'}`}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default memo(UnitToggle);
