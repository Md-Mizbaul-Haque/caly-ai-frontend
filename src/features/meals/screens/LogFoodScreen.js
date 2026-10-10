import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, TextInput, Text, View, Pressable } from 'react-native';
import { Search, X } from '../../../shared/components/ui/icons';
import Card from '../../../shared/components/ui/Card';
import CachedImage from '../../../shared/components/image/CachedImage';
import Chip from '../../../shared/components/ui/Chip';
import PrimaryButton from '../../../shared/components/ui/Button';
import FoodDetailSheet from '../components/FoodDetailSheet';
import { searchFoods } from '../../../shared/lib/foodsApi';
import { recentFoods } from '../../../shared/utils/foodScale';

const TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const SEARCH_DEBOUNCE_MS = 400;
const SUGGESTIONS = ['Eggs', 'Oatmeal', 'Chicken', 'Rice', 'Banana', 'Yogurt'];

function FoodRow({ item, subtitle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Log ${item.name}`}
      className="flex-row items-center bg-cream rounded-2xl px-3 py-2.5 mb-2"
    >
      {item.imageUrl ? (
        <CachedImage uri={item.imageUrl} className="w-12 h-12 rounded-xl mr-3" resizeMode="cover" />
      ) : (
        <View className="w-12 h-12 rounded-xl mr-3 bg-muted items-center justify-center">
          <Text className="text-xl">🍽️</Text>
        </View>
      )}
      <View className="flex-1">
        <Text className="font-bold text-ink" numberOfLines={1}>{item.name}</Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text className="font-bold text-ink ml-2">{Math.round(item.kcal)}<Text className="font-normal text-muted-foreground text-xs"> kcal</Text></Text>
    </Pressable>
  );
}

export default function LogFoodScreen({ meals = [], onSave, photo = null, onRemovePhoto }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [sheet, setSheet] = useState(null); // { food, mode }
  const requestRef = useRef(0);

  // Manual entry (fallback) state — unchanged behavior.
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [type, setType] = useState('Snack');
  const canSave = name.trim().length > 0 && Number(kcal) > 0;

  const recents = useMemo(() => recentFoods(meals, 8), [meals]);
  const trimmed = query.trim();
  const showResults = trimmed.length >= 2;

  function handleQueryChange(v) {
    setQuery(v);
    if (v.trim().length < 2) {
      // Resetting search state on clear belongs in the event handler, not an
      // effect (setState-in-effect causes cascading renders).
      requestRef.current += 1; // invalidate any in-flight search
      setResults([]);
      setSearchError(null);
      setSearching(false);
    } else {
      setSearching(true);
    }
  }

  useEffect(() => {
    if (!showResults) return;
    const id = ++requestRef.current;
    const timer = setTimeout(async () => {
      try {
        const foods = await searchFoods(trimmed, 20);
        if (requestRef.current !== id) return; // stale response
        setResults(foods);
        setSearchError(null);
      } catch (e) {
        if (requestRef.current !== id) return;
        setResults([]);
        setSearchError(e.message || 'Search failed. Try again.');
      } finally {
        if (requestRef.current === id) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, showResults]);

  function macroLine(item) {
    return `${Math.round(item.kcal)} kcal · P ${item.protein || 0}g · C ${item.carbs || 0}g · F ${item.fat || 0}g /100g`;
  }

  return (
    <View className="flex-1 bg-white">
      <FlatList
        className="flex-1 px-4 pt-12"
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Text className="text-2xl font-bold text-ink mb-4">Log food</Text>
            {photo && (
              <View className="mb-4">
                <View className="rounded-card overflow-hidden" style={{ height: 180 }}>
                  <CachedImage uri={photo} className="w-full h-full" resizeMode="cover" />
                <Pressable
                  onPress={onRemovePhoto}
                  accessibilityLabel="Remove photo"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
                >
                  <X size={16} color="#FFFFFF" />
                </Pressable>
                </View>
              </View>
            )}
            <View className="flex-row items-center bg-cream rounded-2xl px-3 mb-2">
              <Search size={18} color="#71717A" />
              <TextInput
                value={query}
                onChangeText={handleQueryChange}
                placeholder="Search foods (e.g. chicken, oatmeal)"
                className="flex-1 px-2 py-3 text-ink"
                returnKeyType="search"
                accessibilityLabel="Search foods"
              />
              {query.length > 0 && (
                <Pressable onPress={() => handleQueryChange('')} accessibilityLabel="Clear search" hitSlop={8}>
                  <X size={18} color="#71717A" />
                </Pressable>
              )}
            </View>
            {searching && <ActivityIndicator className="my-2" />}
            {searchError ? <Text className="text-red-500 mb-2">{searchError}</Text> : null}
          </View>
        }
        data={showResults ? results : []}
        keyExtractor={(item) => String(item.fdcId ?? item.id ?? item.name)}
        ListEmptyComponent={
          showResults && !searching && !searchError ? (
            <Text className="text-muted-foreground text-center my-4">No foods found for “{trimmed}”.</Text>
          ) : !showResults ? (
            <View>
              {recents.length > 0 && (
                <View className="mb-4">
                  <Text className="font-bold text-ink mb-2">Recent</Text>
                  {recents.map((r) => (
                    <FoodRow
                      key={`recent-${r.name}`}
                      item={r}
                      subtitle={`Logged ${r.mealType.toLowerCase()} · ${Math.round(r.kcal)} kcal`}
                      onPress={() => setSheet({ food: r, mode: 'servings' })}
                    />
                  ))}
                </View>
              )}
              <Text className="font-bold text-ink mb-2">Suggestions</Text>
              <View className="flex-row flex-wrap mb-4">
                {SUGGESTIONS.map((s) => (
                  <Chip key={s} label={s} active={false} onPress={() => setQuery(s)} />
                ))}
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <FoodRow item={item} subtitle={macroLine(item)} onPress={() => setSheet({ food: item, mode: 'grams' })} />
        )}
        ListFooterComponent={
          <View className="mt-4">
            <Card>
              <Text className="font-bold text-ink mb-2">Manual entry</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Food name" className="bg-cream rounded-xl px-3 py-2 mb-2" />
              <TextInput value={kcal} onChangeText={setKcal} placeholder="kcal" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
              <TextInput value={protein} onChangeText={setProtein} placeholder="protein g" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
              <TextInput value={carbs} onChangeText={setCarbs} placeholder="carbs g" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
              <TextInput value={fat} onChangeText={setFat} placeholder="fat g" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12, paddingVertical: 2 }} className="mb-4">{TYPES.map((t) => <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />)}</ScrollView>
              {!canSave && <Text className="text-red-500 mb-2">Enter a name and kcal &gt; 0</Text>}
              <PrimaryButton title="Save meal" disabled={!canSave} onPress={() => onSave({ name: name.trim(), kcal: Number(kcal), protein: Number(protein) || 0, carbs: Number(carbs) || 0, fat: Number(fat) || 0, mealType: type, ...(photo ? { imageUrl: photo } : {}) })} />
            </Card>
          </View>
        }
      />
      {sheet && (
        <FoodDetailSheet
          food={sheet.food}
          mode={sheet.mode}
          onClose={() => setSheet(null)}
          onAdd={onSave}
        />
      )}
    </View>
  );
}

