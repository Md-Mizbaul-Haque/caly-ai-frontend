import { View } from 'react-native';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
export default function MacroBar({ label, grams, target, color = '#22C55E', className, indicatorClassName }) {
  const pct = Math.min(100, Math.round((Math.max(grams,0) / Math.max(target,1)) * 100));
  const indicator = indicatorClassName ?? (color.toLowerCase() === '#f2470c' ? 'bg-primary' : 'bg-success');
  return (
    <View className={cn('mb-2', className)}>
      <View className="flex-row justify-between mb-1">
        <Text className="text-sm text-foreground">{label}</Text>
        <Text className="text-sm text-muted-foreground">{grams}g / {target}g</Text>
      </View>
      <Progress value={pct} indicatorClassName={indicator} />
    </View>
  );
}
