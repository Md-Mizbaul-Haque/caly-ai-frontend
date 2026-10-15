import { ScrollView, View, Text } from 'react-native';
import Constants from 'expo-constants';
import Card from '../shared/components/ui/Card';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

const INITIAL_FEATURES = [
  'AI meal scan — snap a photo to log calories and macros',
  'Dashboard with daily calorie ring, macros, and streak',
  'Weight tracker with goals and progress charts',
  'Favorites, Foods, and Find Recipes that fit remaining calories',
  'Progress and history with daily averages',
  'Export My Data as CSV, dark mode appearance',
];

export default function WhatsNewScreen() {
  return (
    <ScrollView className="flex-1 bg-background px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">What&apos;s New</Text>

      <Card className="mb-4">
        <Text className="font-bold mb-2 text-ink">Version {APP_VERSION} — Initial Release (Latest)</Text>
        <View className="space-y-2">
          {INITIAL_FEATURES.map((feature) => (
            <Text key={feature} className="text-ink">• {feature}</Text>
          ))}
        </View>
      </Card>

      <Card>
        <Text className="font-bold mb-2 text-ink">Coming Soon</Text>
        <View className="space-y-2">
          <Text className="text-ink">• Fitness wearable integrations</Text>
          <Text className="text-ink">• Advanced meal planning and grocery lists</Text>
        </View>
      </Card>
    </ScrollView>
  );
}