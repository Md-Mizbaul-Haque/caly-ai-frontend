import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Card from '../../../shared/components/ui/Card';
import { useSession } from '../../auth/session';

// Profile is identity + app info only. The calorie target lives with the
// plan (Weight Tracker wizard recomputes it server-side) — there is no
// manual typing anywhere, so Home can never show a hand-entered number.
export default function ProfileScreen() {
  const { user, authChecked } = useSession();

  if (!authChecked) {
    return (
      <ScrollView className="flex-1 bg-background px-4 pt-12">
        <View className="items-center pt-16">
          <ActivityIndicator size="large" color="#f2470c" />
          <Text className="mt-4 text-muted-foreground">Loading profile...</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background px-4 pt-12">
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

        <View className="mt-4 mb-24"><Card><Text className="text-muted-foreground">Units: metric (v1) • Notifications: off (v1)</Text></Card></View>
      </View>
    </ScrollView>
  );
}
