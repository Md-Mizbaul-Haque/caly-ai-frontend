import { ScrollView, View, Text } from 'react-native';
import { useSession } from '../features/auth/session';
import Card from '../shared/components/ui/Card';

export default function SettingsScreen() {
  const { user } = useSession();

  return (
    <ScrollView className="flex-1 bg-background px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Settings</Text>
      
      {!user ? (
        <Text className="text-muted-foreground">Loading user data...</Text>
      ) : (
        <View className="space-y-4">
          <Card className="mb-4">
            <Text className="font-bold mb-2 text-ink">Account Information</Text>
            <View className="space-y-2">
              <Text className="text-sm text-ink">Name: {user.name || 'Not provided'}</Text>
              <Text className="text-sm text-ink">Email: {user.email}</Text>
              <Text className="text-sm text-ink">User ID: {user.id || user._id || 'Not available'}</Text>
            </View>
          </Card>
          
          <Card>
            <Text className="font-bold mb-2 text-ink">App Settings</Text>
            <Text className="text-sm text-ink">Notifications: Coming soon</Text>
            <Text className="text-sm text-ink">Data & Privacy: Coming soon</Text>
            <Text className="text-sm text-ink">App Version: 1.0.0</Text>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}