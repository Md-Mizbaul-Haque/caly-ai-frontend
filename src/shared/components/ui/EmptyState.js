import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const SKELETON = {
  square: '#EFE6DC',
  line: '#EFE6DC',
  lineSoft: '#F5EEE7',
};

/**
 * Empty state shown when a day has no meals.
 * Stacked-cards skeleton illustration + hint, matching the design mock.
 * The whole illustration is pressable when `onCta` is provided.
 */
export default function EmptyState({ caption = 'Tap + to log a meal', onCta }) {
  const body = (
    <View className="items-center py-6">
      {/* Stacked-cards illustration */}
      <View style={{ width: 240, height: 88 }}>
        {/* bottom-most card */}
        <View
          className="absolute bg-white rounded-2xl border border-[#F1E8E0]"
          style={{ top: 38, left: 27, width: 186, height: 46 }}
        />
        {/* middle card */}
        <View
          className="absolute bg-white rounded-2xl border border-[#F1E8E0]"
          style={{ top: 26, left: 15, width: 210, height: 46 }}
        />
        {/* front card with skeleton meal-row content */}
        <View
          className="absolute bg-white rounded-2xl border border-[#F1E8E0] flex-row items-center"
          style={{
            top: 0,
            left: 0,
            width: 240,
            height: 64,
            paddingHorizontal: 13,
            shadowColor: '#1A1A1A',
            shadowOpacity: 0.06,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: 2,
          }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: SKELETON.square }} />
          <View style={{ marginLeft: 12 }}>
            <View style={{ height: 7, width: 96, borderRadius: 999, backgroundColor: SKELETON.line }} />
            <View style={{ height: 7, width: 62, borderRadius: 999, backgroundColor: SKELETON.lineSoft, marginTop: 8 }} />
          </View>
        </View>
      </View>

      <Text className={cn('text-[15px] text-muted-foreground mt-3')}>{caption}</Text>
    </View>
  );

  if (!onCta) return body;

  return (
    <Pressable
      onPress={onCta}
      accessibilityRole="button"
      accessibilityLabel={caption}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
    >
      {body}
    </Pressable>
  );
}
