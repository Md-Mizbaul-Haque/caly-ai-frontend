import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Card from '../shared/components/ui/Card';
import PrimaryButton from '../shared/components/ui/Button';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import CachedImage from '../shared/components/image/CachedImage';
import { Utensils } from '../shared/components/ui/icons';
import FoodDetailSheet from '../features/meals/components/FoodDetailSheet';
import { fetchFavorites } from '../shared/lib/favoritesApi';
import { createMeal } from '../shared/lib/mealsApi';
import { toastSuccess } from '../shared/utils/toast';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheet, setSheet] = useState(null); // { food }

  function load() {
    return fetchFavorites()
      .then((list) => {
        setFavorites(list);
        setError(null);
      })
      .catch((e) => {
        setError(e.message || 'Could not load favorites. Try again.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(meal) {
    await createMeal({ ...meal, loggedAt: new Date().toISOString() });
    toastSuccess('Meal logged!');
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Favorites, Foods, and Recipes" subtitle="Quickly re-log what you eat often" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          {loading ? (
            <ActivityIndicator className="my-8" />
          ) : error ? (
            <Card>
              <Text className="text-red-500 mb-3">{error}</Text>
              <PrimaryButton
                title="Retry"
                onPress={() => {
                  setLoading(true);
                  load();
                }}
              />
            </Card>
          ) : favorites.length === 0 ? (
            <Card>
              <View className="items-center py-6">
                <View className="w-14 h-14 rounded-full items-center justify-center mb-3 bg-muted">
                  <Utensils size={24} color="#f2470c" />
                </View>
                <Text className="text-[16px] font-bold text-ink mb-1">No favorites yet</Text>
                <Text className="text-[13px] text-muted-foreground text-center">
                  Tap the heart on any food while logging it to save it here for one-tap re-logging.
                </Text>
              </View>
            </Card>
          ) : (
            favorites.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => setSheet({ food: f })}
                accessibilityLabel={`Log ${f.name}`}
                className="flex-row items-center bg-card border border-border rounded-2xl px-3 py-2.5 mb-2"
              >
                {f.imageUrl ? (
                  <CachedImage uri={f.imageUrl} className="w-12 h-12 rounded-xl mr-3" resizeMode="cover" />
                ) : (
                  <View className="w-12 h-12 rounded-xl mr-3 bg-muted items-center justify-center">
                    <Text className="text-xl">🍽️</Text>
                  </View>
                )}
                <View className="flex-1">
                  <Text className="font-bold text-ink" numberOfLines={1}>{f.name}</Text>
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                    P {f.protein || 0}g · C {f.carbs || 0}g · F {f.fat || 0}g
                  </Text>
                </View>
                <Text className="font-bold text-ink ml-2">
                  {Math.round(f.kcal)}
                  <Text className="font-normal text-muted-foreground text-xs"> kcal</Text>
                </Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
      {sheet && (
        <FoodDetailSheet
          food={sheet.food}
          mode="servings"
          onClose={() => {
            setSheet(null);
            load(); // picks up favorites removed via the sheet's heart
          }}
          onAdd={handleAdd}
        />
      )}
    </View>
  );
}
