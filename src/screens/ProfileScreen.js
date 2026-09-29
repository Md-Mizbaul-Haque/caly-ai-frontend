import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Card from '../components/ui/Card';
import { API_URL } from '../../lib/api';
export default function ProfileScreen({ goal, setGoal }) {
  const [draft, setDraft] = useState(String(goal));
  return (
    <ScrollView className="flex-1 bg-cream px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Profile</Text>
      <Card>
        <Text className="font-bold mb-2">Daily goal (kcal)</Text>
        <TextInput value={draft} onChangeText={setDraft} keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        <Text className="text-muted text-sm mb-2">API: {API_URL}</Text>
        <Text onPress={() => { const v = Number(draft); if (v > 0) setGoal(v); }} className="text-primary font-bold">Save goal</Text>
      </Card>
      <View className="mt-4 mb-24"><Card><Text className="text-muted">Units: metric (v1) • Notifications: off (v1)</Text></Card></View>
    </ScrollView>
  );
}
