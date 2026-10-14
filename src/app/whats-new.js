import { ScrollView, View, Text } from 'react-native';
import Card from '../shared/components/ui/Card';

export default function WhatsNewScreen() {
  return (
    <ScrollView className="flex-1 bg-background px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">What&apos;s New</Text>
      
      <Card className="mb-4">
        <Text className="font-bold mb-2 text-ink">Version 1.2.0 (Latest)</Text>
        <View className="space-y-2">
          <Text className="text-ink">• Improved meal recognition accuracy</Text>
          <Text className="text-ink">• Added new food database entries</Text>
          <Text className="text-ink">• Enhanced weight tracking charts</Text>
          <Text className="text-ink">• Bug fixes and performance improvements</Text>
        </View>
      </Card>
      
      <Card className="mb-4">
        <Text className="font-bold mb-2 text-ink">Version 1.1.0</Text>
        <View className="space-y-2">
          <Text className="text-ink">• Introduced calorie and macro targeting</Text>
          <Text className="text-ink">• Added barcode scanning for packaged foods</Text>
          <Text className="text-ink">• Improved onboarding flow</Text>
        </View>
      </Card>
      
      <Card>
        <Text className="font-bold mb-2 text-ink">Coming Soon</Text>
        <View className="space-y-2">
          <Text className="text-ink">• Social features and community challenges</Text>
          <Text className="text-ink">• Integration with fitness wearables (Apple Watch, Fitbit)</Text>
          <Text className="text-ink">• Advanced meal planning and grocery lists</Text>
        </View>
      </Card>
    </ScrollView>
  );
}