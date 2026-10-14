import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight } from '../../../shared/components/ui/icons';

/**
 * One tappable row of the More menu. Rendered inside MenuGroup cards, which
 * draw the separators, so the row itself stays flat. Plain-object styles +
 * manual pressed state (function-form style is never merged with className
 * in this app — see BottomCTA).
 */
export default function MenuRow({ icon: Icon, label, description, onPress, tint = '#1A1A1A', danger = false, last = false }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-row items-center px-4 py-3.5"
      style={{ opacity: pressed ? 0.55 : 1 }}
    >
      <View
        className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${danger ? 'bg-destructive/10' : 'bg-muted'}`}
      >
         {Icon ? <Icon size={18} color={danger ? '#D92D20' : tint} /> : null}
      </View>
      <View className="flex-1 mr-2">
        <Text className="text-[15px] font-semibold text-ink" numberOfLines={1}>{label}</Text>
        {!!description && (
          <Text className="text-[12px] text-muted-foreground mt-0.5" numberOfLines={1}>{description}</Text>
        )}
      </View>
      <ChevronRight size={18} color={danger ? '#D92D20' : '#B5A79A'} />
    </Pressable>
  );
}

export function MenuGroup({ children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children];
  return (
    <View
      className="bg-card rounded-card border border-border overflow-hidden"
      style={{
        shadowColor: '#1A1A1A',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
      }}
    >
      {items.map((item, i) => (
        <View key={i}>
          {item}
          {i < items.length - 1 && <View className="bg-border" style={{ height: 1, marginLeft: 58 }} />}
        </View>
      ))}
    </View>
  );
}
