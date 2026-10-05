import { Pressable, Text, View } from 'react-native';

export default function OptionCard({ title, subtitle, selected, onPress, icon, testID, layout = 'horizontal', style }) {
  const isVertical = layout === 'vertical';
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      className={`rounded-3xl ${isVertical ? 'flex-col items-center justify-center py-5 px-3' : 'flex-row items-center p-4'} ${selected ? 'bg-[#FFF1E9] border-[#f2470c]' : 'bg-white border-[#F1E8E0]'}`}
      style={({ pressed }) => [
        { opacity: pressed ? 0.75 : 1 },
        { borderWidth: 2, minHeight: isVertical ? 112 : undefined, flex: isVertical ? 1 : undefined },
        style,
      ]}
    >
      {!!icon && <View className={isVertical ? 'mb-2 items-center justify-center' : 'mr-3'}>{icon}</View>}
      <View className={isVertical ? 'items-center' : 'flex-1'}>
        <Text
          className={`${isVertical ? 'text-[14px]' : 'text-[16px]'} font-semibold text-[#1A1A1A]`}
          style={isVertical ? { textAlign: 'center' } : undefined}
          numberOfLines={isVertical ? 2 : undefined}
        >
          {title}
        </Text>
        {!!subtitle && <Text className="text-[13px] text-[#8A8A8A] mt-1">{subtitle}</Text>}
      </View>
    </Pressable>
  );
}
