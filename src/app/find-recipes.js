import { ScrollView, Text, View } from 'react-native';
import Card from '../shared/components/ui/Card';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import { BookOpen } from '../shared/components/ui/icons';

const SAMPLES = [
  { name: 'Grilled chicken bowl', detail: '420 kcal · 38g protein' },
  { name: 'Greek yogurt & berries', detail: '210 kcal · 18g protein' },
  { name: 'Veggie omelette', detail: '310 kcal · 22g protein' },
];

export default function FindRecipesScreen() {
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Find Recipes" subtitle="Meals that fit your remaining calories" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Card>
            <View className="flex-row items-center mb-1">
              <View
                className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-muted"
              >
                 <BookOpen size={18} color="#f2470c" />
              </View>
              <Text className="text-[15px] font-bold text-ink">Picked for you</Text>
            </View>
            <Text className="text-[12px] text-muted-foreground mb-2">
              Personalized picks based on your remaining calories are coming soon. Meanwhile, try these balanced ideas:
            </Text>
            {SAMPLES.map((r, i) => (
              <View key={r.name}>
                <View className="py-2.5">
                  <Text className="text-[15px] font-semibold text-ink">{r.name}</Text>
                  <Text className="text-[12px] text-muted-foreground mt-0.5">{r.detail}</Text>
                </View>
                {i < SAMPLES.length - 1 && (
                  <View className="bg-border" style={{ height: 1 }} />
                )}
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
