import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
export default function PrimaryButton({ title, onPress, disabled }) {
  return (
    <Button onPress={onPress} disabled={disabled} className={cn('rounded-btn', disabled ? 'bg-muted' : 'bg-primary')}>
      <Text className={cn('font-bold', disabled ? 'text-muted-foreground' : 'text-primary-foreground')}>{title}</Text>
    </Button>
  );
}
