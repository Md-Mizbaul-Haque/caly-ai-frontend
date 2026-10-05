import { Pressable } from 'react-native';
import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
export default function Chip({ label, active, onPress }) {
  return (
    <Badge variant={active ? 'default' : 'outline'} asChild className={cn('px-4 py-2 mr-2', active ? 'bg-primary' : 'bg-card')}>
      <Pressable onPress={onPress}>
        <Text className={cn('text-sm', active ? 'text-primary-foreground font-bold' : 'text-foreground')}>{label}</Text>
      </Pressable>
    </Badge>
  );
}
