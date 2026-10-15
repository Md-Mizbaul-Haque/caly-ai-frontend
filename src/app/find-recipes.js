import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Card from '../shared/components/ui/Card';
import Chip from '../shared/components/ui/Chip';
import PrimaryButton from '../shared/components/ui/Button';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import { BookOpen } from '../shared/components/ui/icons';
import { fetchSuggestions } from '../shared/lib/foodsApi';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function detail(food) {
  const parts = [`${Math.round(food.kcal || 0)} kcal`];
  if (food.protein) parts.push(`${Math.round(food.protein)}g protein`);
  if (food.servingGram) parts.push(`per ${food.servingGram}${food.servingUnit || 'g'}`);
  return parts.join(' · ');
}

export default function FindRecipesScreen() {
  const [mealType, setMealType] = useState('Breakfast');
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchSuggestions(mealType, 12)
      .then((data) => {
        if (alive) setFoods(data);
      })
      .catch((e) => {
        if (alive) setError(e);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [mealType, reload]);

  function selectMealType(next) {
    if (next === mealType) return;
    setMealType(next);
    setLoading(true);
    setError(null);
  }

  function retry() {
    setReload((n) => n + 1);
    setLoading(true);
    setError(null);
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Find Recipes" subtitle="Meals that fit your remaining calories" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4, marginBottom: 12 }}
          >
            {MEAL_TYPES.map((m) => (
              <Chip key={m} label={m} active={m === mealType} onPress={() => selectMealType(m)} />
            ))}
          </ScrollView>

          <Card>
            <View className="flex-row items-center mb-1">
              <View className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-muted">
                <BookOpen size={18} color="#f2470c" />
              </View>
              <Text className="text-[15px] font-bold text-ink">Picked for you</Text>
            </View>
            <Text className="text-[12px] text-muted-foreground mb-2">
              Real foods from our catalog with per-serving nutrition.
            </Text>

            {loading ? (
              <View className="py-6 items-center">
                <ActivityIndicator color="#f2470c" />
              </View>
            ) : error ? (
              <View className="py-4">
                <Text className="text-[13px] text-muted-foreground mb-3">{error.message}</Text>
                <PrimaryButton title="Try again" onPress={retry} />
              </View>
            ) : foods.length === 0 ? (
              <Text className="text-[13px] text-muted-foreground py-4">
                No picks for this meal type yet.
              </Text>
            ) : (
              foods.map((food, i) => (
                <View key={food.fdcId ?? food.id ?? i}>
                  <View className="py-2.5">
                    <Text className="text-[15px] font-semibold text-ink" numberOfLines={1}>
                      {food.name}
                    </Text>
                    <Text className="text-[12px] text-muted-foreground mt-0.5">{detail(food)}</Text>
                  </View>
                  {i < foods.length - 1 && <View className="bg-border" style={{ height: 1 }} />}
                </View>
              ))
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
