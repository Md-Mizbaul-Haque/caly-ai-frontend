import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useCompactAuth } from './useCompact';

export default function OptionCard({ title, subtitle, selected, onPress, icon, testID, layout = 'horizontal', style }) {
  const isVertical = layout === 'vertical';
  // NOTE: Pressable `style` stays a plain object (see BottomCTA). A
  // function-form style merged with className is never called by React
  // Native, which silently dropped borderWidth/minHeight/flex here and left
  // the cards chromeless. Pressed state is tracked manually instead.
  const [pressed, setPressed] = useState(false);
  const compact = useCompactAuth();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={`rounded-3xl ${isVertical ? 'flex-col items-center justify-center py-5 px-3' : `flex-row items-center ${compact ? 'p-3' : 'p-4'}`} ${selected ? 'bg-accent border-[#f2470c]' : 'bg-card border-border'}`}
      style={[
        { opacity: pressed ? 0.75 : 1 },
        { borderWidth: 2, minHeight: isVertical ? 112 : undefined, flex: isVertical ? 1 : undefined },
        style,
      ]}
    >
      {!!icon && <View className={isVertical ? 'mb-2 items-center justify-center' : 'mr-3'}>{icon}</View>}
      <View className={isVertical ? 'items-center' : 'flex-1'}>
        <Text
          className={`${isVertical ? 'text-[14px]' : 'text-[16px]'} font-semibold text-ink`}
          style={isVertical ? { textAlign: 'center' } : undefined}
          numberOfLines={isVertical ? 2 : undefined}
        >
          {title}
        </Text>
        {!!subtitle && <Text className="text-[13px] text-muted-foreground mt-1">{subtitle}</Text>}
      </View>
    </Pressable>
  );
}
