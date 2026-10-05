import { View } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import ProgressRing from './ProgressRing';

export default function MacroCard({ label, grams = 0, target = 1, color, icon: Icon, style, className }) {
  const safeTarget = Math.max(Number(target) || 0, 1);
  const safeGrams = Math.max(Number(grams) || 0, 0);
  return (
    <Card style={[{ shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }, style]} className={cn('rounded-card border-border bg-card py-3', className)}>
      <CardContent className="px-3">
        <View className="flex-row items-baseline">
          <Text className="text-base font-bold text-foreground">{safeGrams}</Text>
          <Text className="text-xs text-muted-foreground"> /{safeTarget}g</Text>
        </View>
        <Text className="text-xs font-medium text-muted-foreground mt-0.5 mb-2">{label}</Text>
        <View className="items-center">
          <ProgressRing eaten={safeGrams} goal={safeTarget} size={54} strokeWidth={6} color={color}>
            <Icon size={18} color={color} strokeWidth={2} />
          </ProgressRing>
        </View>
      </CardContent>
    </Card>
  );
}
