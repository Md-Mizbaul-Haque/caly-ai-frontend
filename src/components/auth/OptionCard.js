import { Pressable, Text, View } from 'react-native';

export default function OptionCard({ title, subtitle, selected, onPress, icon, testID }) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      className={`bg-white rounded-3xl p-5 flex-row items-center ${selected ? 'border-black' : 'border-transparent'}`}
      style={{ borderWidth: selected ? 2 : 0 }}
    >
      {!!icon && <View className="mr-4">{icon}</View>}
      <View className="flex-1">
        <Text className="text-[20px] font-semibold text-black">{title}</Text>
        {!!subtitle && <Text className="text-[15px] text-black/60 mt-1">{subtitle}</Text>}
      </View>
    </Pressable>
  );
}
