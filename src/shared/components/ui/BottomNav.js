import { Pressable, Text, View } from 'react-native';
import { House, ChartColumn, Settings, Plus, X } from './icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const tokens = require('../../theme/tokens.js');

const ITEMS = [
  { key: 'dashboard', label: 'Home', Icon: House },
  { key: 'history', label: 'Progress', Icon: ChartColumn },
  { key: 'profile', label: 'Settings', Icon: Settings },
];

export default function BottomNav({ active, onChange, sheetOpen = false, onToggleSheet }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="bg-white flex-row items-center pl-1 pr-4 pt-2"
      style={{
        paddingBottom: Math.max(insets.bottom, 10),
        borderTopWidth: 1,
        borderTopColor: tokens.colors.border,
        shadowColor: tokens.colors.ink,
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        elevation: 8,
      }}
    >
      {ITEMS.map(item => {
        const isActive = active === item.key;
        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)} className="flex-1 items-center py-1.5" hitSlop={4}>
            <item.Icon
              size={22}
              color={isActive ? tokens.colors.primary : tokens.colors.muted}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <Text className={`text-[11px] mt-1 ${isActive ? 'text-primary font-semibold' : 'text-muted'}`}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        onPress={onToggleSheet}
        accessibilityLabel={sheetOpen ? 'Close quick log' : 'Log food'}
        className="w-12 h-12 rounded-full bg-primary items-center justify-center ml-2"
        style={{
          elevation: 4,
          shadowColor: tokens.colors.primary,
          shadowOpacity: 0.35,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        {sheetOpen
          ? <X size={26} color="white" strokeWidth={2.5} />
          : <Plus size={26} color="white" strokeWidth={2.5} />}
      </Pressable>
    </View>
  );
}
