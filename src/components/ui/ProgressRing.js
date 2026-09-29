import { View, Text } from 'react-native';
export default function ProgressRing({ eaten, goal }) {
  const safeGoal = Math.max(goal, 1);
  const pct = Math.min(100, Math.round((Math.max(eaten, 0) / safeGoal) * 100));
  const remaining = goal - eaten;
  return (
    <View className="items-center justify-center py-4">
      <Text className="text-4xl font-bold text-ink">{pct}%</Text>
      <Text className="text-muted mt-1">{Math.max(eaten,0)} / {goal} kcal</Text>
      <Text className={remaining < 0 ? 'text-red-500 font-bold mt-1' : 'text-success font-bold mt-1'}>
        {remaining < 0 ? `${Math.abs(remaining)} over` : `${remaining} left`}
      </Text>
    </View>
  );
}
