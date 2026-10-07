import { ScrollView, View, Text, TextInput, Button } from 'react-native';
import { useSession } from '../features/auth/session';
import { Card } from '../shared/components/ui/Card';
import { PrimaryButton } from '../shared/components/ui/Button';
import { useState } from 'react';

export default function WeightTrackerScreen() {
  const { user } = useSession();
  const [weight, setWeight] = useState('');

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Weight Tracker</Text>
      
      {!user ? (
        <Text className="text-muted-foreground">Loading user data...</Text>
      ) : (
        <View className="space-y-6">
          <Card className="mb-4">
            <Text className="font-bold mb-2">Current Weight</Text>
            <View className="space-y-3">
              <Text className="text-sm">Log your weight to track progress over time</Text>
              <TextInput
                placeholder="Enter weight (kg)"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                className="border border-muted-background rounded-xl px-4 py-2 w-full"
              />
              <PrimaryButton
                title="Save Weight"
                onPress={() => {
                  if (weight) {
                    console.log('Saving weight:', weight);
                    // TODO: Implement actual weight saving
                    setWeight('');
                  }
                }}
                className="w-full"
              />
            </View>
          </Card>
          
          <Card>
            <Text className="font-bold mb-2">Weight History</Text>
            <Text className="text-sm">Your weight history will appear here.</Text>
            <Text className="text-sm text-muted-foreground">Coming soon</Text>
          </Card>
        </View>
      )}
    </ScrollView>
  );
}