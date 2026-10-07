import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import Card from '../../../shared/components/ui/Card';
import PrimaryButton from '../../../shared/components/ui/Button';
import { toastSuccess, toastError } from '../../../shared/utils/toast';
import { updateProfile } from '../../../shared/lib/authApi';
import { API_URL } from '../../../shared/lib/api';
import { useSession } from '../../auth/session';
export default function ProfileScreen() {
  const { user, goal, setGoal, authChecked } = useSession();
  const [draft, setDraft] = useState(String(goal));
  const [busy, setBusy] = useState(false);

  if (!authChecked) {
    return (
      <ScrollView className="flex-1 bg-white px-4 pt-12">
        <View className="items-center pt-16">
          <ActivityIndicator size="large" color="#f2470c" />
          <Text className="mt-4 text-muted-foreground">Loading profile...</Text>
        </View>
      </ScrollView>
    );
  }

  const parsed = Number(draft);
  const valid = draft.trim().length > 0 && Number.isFinite(parsed) && parsed >= 500 && parsed <= 10000;

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Profile</Text>
      <View className="space-y-6">
        {/* User info card */}
        <Card>
          <View className="flex-row items-center space-x-4">
            <View className="w-14 h-14 rounded-full items-center justify-center" style={{ backgroundColor: '#f2470c' }}>
              <Text className="text-white text-2xl font-extrabold">
                {(user?.name?.trim()[0] || 'C').toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="font-bold text-ink">{user?.name || 'Unnamed User'}</Text>
              <Text className="text-[13px] text-muted-foreground">{user?.email || 'No email'}</Text>
            </View>
          </View>
        </Card>

        {/* Daily goal card */}
        <Card>
          <Text className="font-bold mb-2">Daily goal (kcal)</Text>
          <TextInput value={draft} onChangeText={setDraft} keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
          {!valid && <Text className="text-red-500 mb-2">Enter 500–10000 kcal</Text>}
          <Text className="text-muted-foreground text-sm mb-2">API: {API_URL}</Text>
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

        <View className="mt-4 mb-24"><Card><Text className="text-muted-foreground">Units: metric (v1) • Notifications: off (v1)</Text></Card></View>
      </View>
    </ScrollView>
  );
}
