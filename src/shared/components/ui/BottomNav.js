import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { House, ChartColumn, Ellipsis, Plus, X, Utensils } from './icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const ITEMS = [
  { key: 'dashboard', label: 'Home', Icon: House },
  { key: 'history', label: 'Progress', Icon: ChartColumn },
  { key: 'meals', label: 'Meals', Icon: Utensils },
  { key: 'more', label: 'More', Icon: Ellipsis },
];

export default function BottomNav({ active, onChange, sheetOpen = false, onToggleSheet }) {
  const insets = useSafeAreaInsets();
  const leftItems = ITEMS.slice(0, 2);
  const rightItems = ITEMS.slice(2);
  return (
    <View
      className={cn('bg-card flex-row items-center pl-1 pr-4 pt-2')}
      style={{
        paddingBottom: Math.max(insets.bottom, 10),
        borderTopWidth: 1,
        borderTopColor: '#F1E8E0',
        shadowColor: '#1A1A1A',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        elevation: 8,
      }}
    >
      <View className="flex-1 flex-row justify-around">
        {leftItems.map(item => {
          const isActive = active === item.key;
          return (
            <Pressable key={item.key} onPress={() => onChange(item.key)} className="flex-1 items-center py-1.5" hitSlop={8}>
              <item.Icon
                size={22}
                color={isActive ? '#f2470c' : '#8A8A8A'}
                 strokeWidth={isActive ? 1.8 : 1.5}
              />
              <Text className={cn('text-[11px] mt-1', isActive ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={onToggleSheet}
        accessibilityLabel={sheetOpen ? 'Close quick log' : 'Log food'}
        className={cn('w-14 h-14 rounded-full bg-primary items-center justify-center mx-1 -mt-6 border-4 border-white')}
        style={{
          elevation: 6,
          shadowColor: '#f2470c',
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        {sheetOpen
           ? <X size={28} color="white" strokeWidth={2} />
           : <Plus size={28} color="white" strokeWidth={2} />}
      </Pressable>
      <View className="flex-1 flex-row justify-around">
        {rightItems.map(item => {
          const isActive = active === item.key;
          return (
            <Pressable key={item.key} onPress={() => onChange(item.key)} className="flex-1 items-center py-1.5" hitSlop={8}>
              <item.Icon
                size={22}
                color={isActive ? '#f2470c' : '#8A8A8A'}
                 strokeWidth={isActive ? 1.8 : 1.5}
              />
              <Text className={cn('text-[11px] mt-1', isActive ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
