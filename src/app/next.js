import { ScrollView, Text } from 'react-native';
import Card from '../shared/components/ui/Card';

export default function NextScreen() {
  return (
    <ScrollView className="flex-1 bg-background px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Upcoming Features</Text>
      
      <Card className="mb-4">
        <Text className="font-bold mb-2 text-ink">Social Sharing</Text>
        <Text className="text-sm text-ink">Share your progress, meals, and achievements with friends</Text>
      </Card>
      
      <Card className="mb-4">
        <Text className="font-bold mb-2 text-ink">Meal Planning</Text>
        <Text className="text-sm text-ink">Weekly meal planners and grocery list generation</Text>
      </Card>
      
      <Card className="mb-4">
        <Text className="font-bold mb-2 text-ink">Fitness Integration</Text>
        <Text className="text-sm text-ink">Sync with Google Fit, Apple Health, and other fitness platforms</Text>
      </Card>
      
      <Card>
        <Text className="font-bold mb-2 text-ink">Voice Logging</Text>
        <Text className="text-sm text-ink">Log meals using voice commands for hands-free tracking</Text>
      </Card>
    </ScrollView>
  );
}