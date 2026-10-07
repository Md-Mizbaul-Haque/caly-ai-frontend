import { ScrollView, Text, View } from 'react-native';
import Card from '../shared/components/ui/Card';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import { Utensils } from '../shared/components/ui/icons';

export default function FavoritesScreen() {
  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Favorites, Foods, and Recipes" subtitle="Quickly re-log what you eat often" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Card>
            <View className="items-center py-6">
              <View
                className="w-14 h-14 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: '#F1E8E0' }}
              >
                 <Utensils size={24} color="#f2470c" />
              </View>
              <Text className="text-[16px] font-bold text-ink mb-1">No favorites yet</Text>
              <Text className="text-[13px] text-muted-foreground text-center">
                Meals you log often will appear here for one-tap re-logging.
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
