import { ScrollView, View, Text } from 'react-native';
import { Card } from '../shared/components/ui/Card';

export default function NextScreen() {
  return (
    <ScrollView className="flex-1 bg-white px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Upcoming Features</Text>
      
      <Card className="mb-4">
        <Text className="font-bold mb-2">Social Sharing</Text>
        <Text className="text-sm">Share your progress, meals, and achievements with friends</Text>
      </Card>
      
      <Card className="mb-4">
        <Text className="font-bold mb-2">Meal Planning</Text>
        <Text className="text-sm">Weekly meal planners and grocery list generation</Text>
      </Card>
      
      <Card className="mb-4">
        <Text className="font-bold mb-2">Fitness Integration</Text>
        <Text className="text-sm">Sync with Google Fit, Apple Health, and other fitness platforms</Text>
      </Card>
      
      <Card>
        <Text className="font-bold mb-2">Voice Logging</Text>
        <Text className="text-sm">Log meals using voice commands for hands-free tracking</Text>
      </Card>
    </ScrollView>
  );
}