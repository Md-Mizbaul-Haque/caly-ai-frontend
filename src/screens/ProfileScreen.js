import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Card from '../components/ui/Card';
import PrimaryButton from '../components/ui/Button';
import { toastSuccess, toastError } from '../utils/toast';
import { updateProfile } from '../lib/authApi';
import { API_URL } from '../../lib/api';
export default function ProfileScreen({ goal, setGoal }) {
  const [draft, setDraft] = useState(String(goal));
  const [busy, setBusy] = useState(false);
  const parsed = Number(draft);
  const valid = draft.trim().length > 0 && Number.isFinite(parsed) && parsed >= 500 && parsed <= 10000;
  return (
    <ScrollView className="flex-1 bg-cream px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Profile</Text>
      <Card>
        <Text className="font-bold mb-2">Daily goal (kcal)</Text>
        <TextInput value={draft} onChangeText={setDraft} keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        {!valid && <Text className="text-red-500 mb-2">Enter 500–10000 kcal</Text>}
        <Text className="text-muted text-sm mb-2">API: {API_URL}</Text>
        <PrimaryButton
          title={busy ? 'Saving…' : 'Save goal'}
          disabled={!valid || busy}
          onPress={async () => {
            setBusy(true);
            try {
              const data = await updateProfile(parsed);
              setGoal(data.user.dailyGoalKcal);
              toastSuccess('Goal updated', `${data.user.dailyGoalKcal} kcal per day`);
            } catch (e) {
              toastError('Could not save goal', e.message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </Card>
      <View className="mt-4 mb-24"><Card><Text className="text-muted">Units: metric (v1) • Notifications: off (v1)</Text></Card></View>
    </ScrollView>
  );
}
