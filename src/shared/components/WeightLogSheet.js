import { useEffect, useState } from 'react';
import { Alert, Animated, Pressable, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from './ui/icons';
/**
 * Docked sheet for logging weight. Weight (lbs) is required; goal weight
 * prefills from the saved goal and only updates when changed.
 */
export default function WeightLogSheet({ bottomOffset = 0, currentGoal = null, onClose, onSave }) {
  const [progress] = useState(() => new Animated.Value(0));
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState(currentGoal ? String(currentGoal) : '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [progress]);

  function dismiss(after = onClose) {
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
      if (finished) after?.();
    });
  }

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });

  async function handleSave() {
    const value = parseFloat(weight);
    if (!Number.isFinite(value) || value < 20 || value > 1000) {
      Alert.alert('Invalid weight', 'Enter a weight between 20 and 1000 lbs.');
      return;
    }
    const goalValue = parseFloat(goal);
    const payload = { value };
    if (Number.isFinite(goalValue) && goalValue >= 20 && goalValue <= 1000) {
      payload.goal = goalValue;
    }
    setBusy(true);
    try {
      await onSave(payload);
      dismiss();
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="absolute inset-0" pointerEvents="box-none" style={{ zIndex: 40 }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: bottomOffset,
          backgroundColor: 'rgba(26,26,26,0.45)',
          opacity: progress,
        }}
      >
        <Pressable className="flex-1" onPress={() => dismiss()} accessibilityLabel="Close log weight" />
      </Animated.View>

      <Animated.View
        className={cn('bg-card rounded-t-[24px] px-4 pt-4 pb-6 border-t border-border')}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: bottomOffset,
          opacity: progress,
          transform: [{ translateY }],
          shadowColor: '#1A1A1A',
          shadowOpacity: 0.1,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -6 },
          elevation: 12,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <Text className={cn('text-lg font-bold text-foreground')}>Log Weight</Text>
          <Pressable onPress={() => dismiss()} accessibilityLabel="Close" hitSlop={8}>
            <X size={20} color={'#1A1A1A'} />
          </Pressable>
        </View>

        <Text className={cn('text-xs text-muted-foreground mb-1')}>Weight (lbs)</Text>
        <Input
          value={weight}
          onChangeText={v => setWeight(v.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="e.g. 132.1"
          autoFocus
          className={cn('bg-muted rounded-xl px-4 py-3 text-base text-foreground mb-3')}
        />

        <Text className={cn('text-xs text-muted-foreground mb-1')}>Goal weight (lbs)</Text>
        <Input
          value={goal}
          onChangeText={v => setGoal(v.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder="e.g. 140"
          className={cn('bg-muted rounded-xl px-4 py-3 text-base text-foreground mb-4')}
        />

        <Button
          onPress={handleSave}
          disabled={busy}
          className={cn(busy ? 'bg-muted' : 'bg-primary')}
          accessibilityLabel="Save weight"
        >
          <Text className={cn('font-bold', busy ? 'text-muted-foreground' : 'text-primary-foreground')}>
            {busy ? 'Saving…' : 'Save'}
          </Text>
        </Button>
      </Animated.View>
    </View>
  );
}
