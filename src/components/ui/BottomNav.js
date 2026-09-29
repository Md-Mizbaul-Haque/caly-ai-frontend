import { Pressable, Text, View } from 'react-native';
import { House, ChartLine, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const tokens = require('../../theme/tokens.js');

const ITEMS = [
  { key: 'dashboard', label: 'Home', Icon: House },
  { key: 'history', label: 'Progress', Icon: ChartLine },
  { key: 'profile', label: 'Profile', Icon: User },
];

export default function BottomNav({ active, onChange }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-white border-t border-[#F1E8E0] flex-row pt-2" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
      {ITEMS.map(item => {
        const isActive = active === item.key;
        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)} className="flex-1 items-center py-1" hitSlop={4}>
            <item.Icon
              size={22}
              color={isActive ? tokens.colors.primary : tokens.colors.muted}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <Text className={`text-[11px] mt-1 ${isActive ? 'text-primary font-semibold' : 'text-muted'}`}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
