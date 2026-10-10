import { ScrollView, View, Text, Switch } from 'react-native';
import { useSession } from '../features/auth/session';
import Card from '../shared/components/ui/Card';

export default function NotificationsScreen() {
  const { user } = useSession();

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Notification Settings</Text>
      
      {!user ? (
        <Text className="text-muted-foreground">Loading user data...</Text>
      ) : (
        <View className="space-y-6">
          <Card className="mb-4">
            <Text className="font-bold mb-2">Push Notifications</Text>
            <View className="flex flex-row items-center justify-between p-4">
              <Text>Meal reminders</Text>
              <Switch 
                value={true} 
                onValueChange={(value) => console.log('Meal reminders:', value)}
              />
            </View>
            <View className="flex flex-row items-center justify-between p-4 border-t">
              <Text>Weekly progress</Text>
              <Switch 
                value={false} 
                onValueChange={(value) => console.log('Weekly progress:', value)}
              />
            </View>
          </Card>
          
          <Card>
            <Text className="font-bold mb-2">Email Notifications</Text>
            <View className="flex flex-row items-center justify-between p-4">
              <Text>Newsletter</Text>
              <Switch 
                value={true} 
                onValueChange={(value) => console.log('Newsletter:', value)}
              />
            </View>
            <View className="flex flex-row items-center justify-between p-4 border-t">
              <Text>Promotional offers</Text>
              <Switch 
                value={false} 
                onValueChange={(value) => console.log('Promotional offers:', value)}
              />
            </View>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}