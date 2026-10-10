import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  Search, X, Clock, Heart, ScanBarcode, Camera,
  ChevronRight, Pencil, Plus,
  Apple, Carrot, Beef, Wheat, Milk, Cookie,
} from '../../../shared/components/ui/icons';
import Card from '../../../shared/components/ui/Card';
import CachedImage from '../../../shared/components/image/CachedImage';
import Chip from '../../../shared/components/ui/Chip';
import PrimaryButton from '../../../shared/components/ui/Button';
import FoodDetailSheet from '../components/FoodDetailSheet';
import { searchFoods, fetchSuggestions, fetchMyFoods } from '../../../shared/lib/foodsApi';
import { recentFoods, defaultMealType } from '../../../shared/utils/foodScale';

const TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const TYPE_EMOJI = { Breakfast: '☀️', Lunch: '☀️', Dinner: '🌙', Snack: '🥤' };
const SEARCH_DEBOUNCE_MS = 400;
const CATEGORIES = [
  { key: 'Fruits', Icon: Apple, tint: '#FDECEC', color: '#D92D20' },
  { key: 'Vegetables', Icon: Carrot, tint: '#E7F6EC', color: '#12805C' },
  { key: 'Proteins', Icon: Beef, tint: '#FFF1E5', color: '#C2410C' },
  { key: 'Grains', Icon: Wheat, tint: '#FBF3DB', color: '#A16207' },
  { key: 'Dairy', Icon: Milk, tint: '#EAF2FD', color: '#1D6FD1' },
  { key: 'Snacks', Icon: Cookie, tint: '#F3ECFD', color: '#7C3AED' },
];
const FALLBACK_SUGGESTIONS = {
  Breakfast: [
    { name: 'Oatmeal', kcal: 180, protein: 6, carbs: 32, fat: 3, portion: '1 bowl (150g)' },
    { name: 'Boiled Egg', kcal: 156, protein: 13, carbs: 1, fat: 11, portion: '2 large (100g)' },
    { name: 'Banana', kcal: 105, protein: 1, carbs: 27, fat: 0, portion: '1 medium (118g)' },
  ],
  Lunch: [
    { name: 'Chicken Rice', kcal: 420, protein: 28, carbs: 45, fat: 12, portion: '1 plate (300g)' },
    { name: 'Scrambled Eggs', kcal: 201, protein: 13, carbs: 2, fat: 15, portion: '2 eggs (100g)' },
  ],
  Dinner: [
    { name: 'Grilled Chicken', kcal: 320, protein: 35, carbs: 2, fat: 14, portion: '1 fillet (150g)' },
  ],
  Snack: [
    { name: 'Black Coffee', kcal: 2, protein: 0, carbs: 0, fat: 0, portion: '1 cup (240ml)' },
    { name: 'Whole Wheat Bread', kcal: 69, protein: 3, carbs: 12, fat: 1, portion: '1 slice (28g)' },
  ],
  Fruits: [
    { name: 'Apple', kcal: 95, protein: 0, carbs: 25, fat: 0, portion: '1 medium' },
    { name: 'Banana', kcal: 105, protein: 1, carbs: 27, fat: 0, portion: '1 medium' },
    { name: 'Orange', kcal: 87, protein: 1, carbs: 21, fat: 0, portion: '1 medium' },
  ],
  Vegetables: [
    { name: 'Carrot', kcal: 41, protein: 1, carbs: 10, fat: 0, portion: '1 medium' },
    { name: 'Broccoli', kcal: 55, protein: 4, carbs: 11, fat: 0, portion: '1 cup' },
    { name: 'Spinach', kcal: 7, protein: 3, carbs: 1, fat: 0, portion: '1 cup' },
  ],
  Proteins: [
    { name: 'Grilled Chicken', kcal: 320, protein: 35, carbs: 2, fat: 14, portion: '1 fillet (150g)' },
    { name: 'Salmon', kcal: 280, protein: 25, carbs: 0, fat: 18, portion: '1 fillet (150g)' },
    { name: 'Eggs', kcal: 155, protein: 13, carbs: 1, fat: 11, portion: '2 large' },
  ],
  Grains: [
    { name: 'Brown Rice', kcal: 230, protein: 5, carbs: 52, fat: 2, portion: '1 cup cooked' },
    { name: 'Quinoa', kcal: 222, protein: 8, carbs: 39, fat: 4, portion: '1 cup cooked' },
    { name: 'Whole Wheat Bread', kcal: 110, protein: 4, carbs: 22, fat: 2, portion: '2 slices' },
  ],
  Dairy: [
    { name: 'Milk', kcal: 150, protein: 8, carbs: 12, fat: 8, portion: '1 cup' },
    { name: 'Greek Yogurt', kcal: 120, protein: 15, carbs: 6, fat: 0, portion: '1 container (150g)' },
    { name: 'Cheese', kcal: 180, protein: 6, carbs: 1, fat: 15, portion: '1 oz' },
  ],
  Snacks: [
    { name: 'Apple', kcal: 95, protein: 0, carbs: 25, fat: 0, portion: '1 medium' },
    { name: 'Popcorn', kcal: 108, protein: 3, carbs: 13, fat: 5, portion: '3 cups' },
    { name: 'Almonds', kcal: 164, protein: 6, carbs: 6, fat: 14, portion: '1/4 cup' },
  ],
};

function MealPill({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      className={`flex-row items-center px-4 py-2.5 rounded-full mr-2 ${active ? 'bg-primary' : 'bg-cream'}`}
    >
      <Text className="text-sm mr-1">{TYPE_EMOJI[label] || '🍽️'}</Text>
      <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}

function QuickAction({ Icon, label, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} className="flex-1 bg-cream rounded-2xl items-center py-3 px-1">
      <Icon size={20} color="#1A1A1A" />
      <Text className="text-[11px] font-semibold text-ink mt-1.5" numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function FoodCard({ item, subtitle, onAdd }) {
  return (
    <View className="w-28 mr-3">
      <View className="w-28 h-24 rounded-2xl bg-cream items-center justify-center overflow-hidden mb-1.5">
        {item.imageUrl ? (
                      <CachedImage uri={item.imageUrl} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Text className="text-4xl">{item.emoji || '🍽️'}</Text>
        )}
      </View>
      <Text className="text-xs font-bold text-ink" numberOfLines={1}>{item.name}</Text>
      <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>{subtitle}</Text>
      <View className="flex-row items-center justify-between mt-1">
        <Text className="text-xs font-bold text-ink">{Math.round(item.kcal)} <Text className="font-normal text-muted-foreground">kcal</Text></Text>
        <Pressable onPress={onAdd} accessibilityLabel={`Add ${item.name}`} className="w-7 h-7 rounded-full bg-cream items-center justify-center border border-border">
          <Plus size={16} color="#f2470c" />
        </Pressable>
      </View>
    </View>
  );
}

function SectionHeader({ title, onSeeAll, actionLabel = 'See all' }) {
  return (
    <View className="flex-row items-center justify-between mb-2 mt-4">
      <Text className="text-base font-bold text-ink">{title}</Text>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} accessibilityLabel={`${actionLabel}: ${title}`} accessibilityRole="button" className="flex-row items-center">
          <Text className="text-xs font-semibold text-primary mr-0.5">{actionLabel}</Text>
          <ChevronRight size={14} color="#f2470c" />
        </Pressable>
      ) : null}
    </View>
  );
}

function CategoryTile({ tile, size = 64, onPress }) {
  const { key, Icon, tint, color } = tile;
  return (
    <Pressable onPress={() => onPress(key)} accessibilityLabel={`Browse ${key}`} accessibilityRole="button" className="items-center" style={{ width: size + 16 }}>
      <View className="rounded-2xl items-center justify-center mb-1" style={{ width: size, height: size, backgroundColor: tint }}>
        <Icon size={Math.round(size * 0.42)} color={color} />
      </View>
      <Text className="text-xs font-semibold text-ink" numberOfLines={1}>{key}</Text>
    </Pressable>
  );
}

export default function MealsScreen({ meals = [], onSave, onOpenQuickLog }) {
  const [mealType, setMealType] = useState(() => defaultMealType(new Date().getHours()));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const requestRef = useRef(0);

  const trimmed = query.trim();
  const showResults = trimmed.length >= 2;
  const canSave = name.trim().length > 0 && Number(kcal) > 0;
  const mealLower = mealType.toLowerCase();

  const previousLogs = useMemo(() => {
    const recents = recentFoods(meals, 20);
    const filtered = recents.filter((r) => (r.mealType || '').toLowerCase() === mealLower);
    return (filtered.length ? filtered : recents).slice(0, 8);
  }, [meals, mealLower]);

  function selectMealType(t) {
    setMealType(t);
    setSuggestionsLoading(true);
  }

  useEffect(() => {
    let alive = true;
    fetchSuggestions(mealType, 10)
      .then((foods) => { if (alive) setSuggestions(foods); })
      .catch(() => { if (alive) setSuggestions(FALLBACK_SUGGESTIONS[mealType] || []); })
      .finally(() => { if (alive) setSuggestionsLoading(false); });
    return () => { alive = false; };
  }, [mealType]);

  function handleQueryChange(v) {
    setQuery(v);
    if (v.trim().length < 2) {
      requestRef.current += 1;
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
        if (requestRef.current !== id) return;
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

  async function handleMyFoods() {
    try {
      setSearching(true);
      const mine = await fetchMyFoods(10);
      setResults(mine);
      setQuery('My foods');
      setSearchError(null);
    } catch (e) {
      setSearchError(e.message || 'Could not load your foods.');
    } finally {
      setSearching(false);
    }
  }

  function portionOf(item, fallback) {
    if (item.portion) return item.portion;
    if (fallback) return fallback;
    return `${mealType} serving`;
  }

  async function handleManualSave() {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        name: name.trim(),
        kcal: Number(kcal),
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        mealType,
      });
      setName('');
      setKcal('');
      setProtein('');
      setCarbs('');
      setFat('');
    } catch (e) {
      setSaveError(e.message || 'Could not save this meal. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4 pt-12" contentContainerStyle={{ paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
         <View className="flex-row items-center mb-1">
           <View>
             <Text className="text-2xl font-bold text-ink">Log food</Text>
             <Text className="text-xs text-muted-foreground">Search, tap, or add manually</Text>
           </View>
         </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 mb-3 -mx-4 px-4">
          {TYPES.map((t) => (
            <MealPill key={t} label={t} active={mealType === t} onPress={() => selectMealType(t)} />
          ))}
        </ScrollView>

        <View className="flex-row items-center bg-cream rounded-2xl px-3 mb-3">
          <Search size={18} color="#71717A" />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder="Search foods (e.g. chicken, oatmeal, banana)"
            className="flex-1 px-2 py-3 text-ink"
            returnKeyType="search"
            accessibilityLabel="Search foods"
          />
          {query.length > 0 && (
            <Pressable onPress={() => handleQueryChange('')} accessibilityLabel="Clear search" hitSlop={8} className="mr-1">
              <X size={18} color="#71717A" />
            </Pressable>
          )}

        </View>

        <View className="flex-row mb-1" style={{ gap: 8 }}>
          <QuickAction Icon={Clock} label="Recent" onPress={() => setQuery('')} />
          <QuickAction Icon={Heart} label="MyFoods" onPress={handleMyFoods} />
          <QuickAction Icon={ScanBarcode} label="Barcode" onPress={onOpenQuickLog} />
          <QuickAction Icon={Camera} label="Scan Meal" onPress={onOpenQuickLog} />
        </View>

        {showResults ? (
          <View className="mt-4">
            <Text className="text-base font-bold text-ink mb-2">Results for “{trimmed}”</Text>
            {searching && <ActivityIndicator className="my-2" />}
            {searchError ? <Text className="text-red-500 mb-2">{searchError}</Text> : null}
            {!searching && !searchError && results.length === 0 && (
              <Text className="text-muted-foreground text-center my-4">No foods found.</Text>
            )}
             {results.map((item) => (
               <Pressable
                 key={String(item.fdcId ?? item.id ?? item.name)}
                 onPress={() => setSheet({ food: item, mode: 'grams' })}
                 className="flex-row items-center bg-cream rounded-2xl px-3 py-2.5 mb-2"
               >
                 <View className="w-10 h-10 rounded-2xl bg-cream items-center justify-center mr-3">
                   {item.imageUrl ? (
          <CachedImage uri={item.imageUrl} className="w-full h-full" resizeMode="cover" />
                   ) : (
                     <Text className="text-2xl">{item.emoji || '🍽️'}</Text>
                   )}
                 </View>
                 <View className="flex-1">
                   <Text className="font-bold text-ink" numberOfLines={1}>{item.name}</Text>
                   <Text className="text-xs text-muted-foreground" numberOfLines={1}>{Math.round(item.kcal)} kcal /100g</Text>
                 </View>
                 <Text className="font-bold text-primary">+</Text>
               </Pressable>
             ))}
          </View>
        ) : (
          <View>
            <SectionHeader title={`Previous ${mealLower} logs`} />
            {previousLogs.length === 0 ? (
              <Text className="text-muted-foreground text-sm">No {mealLower} logs yet — log your first one below.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                {previousLogs.map((item) => (
                  <FoodCard
                    key={`prev-${item.name}`}
                    item={item}
                    subtitle={portionOf(item, `Logged ${mealLower}`)}
                    onAdd={() => setSheet({ food: item, mode: 'servings' })}
                  />
                ))}
              </ScrollView>
            )}

            <SectionHeader title={`Suggestions for ${mealLower}`} />
            {suggestionsLoading ? <ActivityIndicator className="my-2" /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
                {(suggestions.length ? suggestions : (FALLBACK_SUGGESTIONS[mealType] || [])).map((item) => (
                  <FoodCard
                    key={`sug-${item.fdcId ?? item.name}`}
                    item={item}
                    subtitle={portionOf(item, `${Math.round(item.kcal)} kcal`)}
                    onAdd={() => setSheet({ food: item, mode: 'grams' })}
                  />
                ))}
              </ScrollView>
            )}

            <SectionHeader
              title="Browse by category"
              actionLabel={showAllCategories ? 'Show less' : 'See all'}
              onSeeAll={() => setShowAllCategories((v) => !v)}
            />
            {showAllCategories ? (
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                {CATEGORIES.map((tile) => (
                  <View key={tile.key} style={{ width: '30%' }} className="items-center">
                    <CategoryTile tile={tile} size={56} onPress={() => selectMealType(tile.key)} />
                  </View>
                ))}
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }} className="-mx-4 px-4">
                {CATEGORIES.map((tile) => (
                  <CategoryTile key={tile.key} tile={tile} size={56} onPress={() => selectMealType(tile.key)} />
                ))}
              </ScrollView>
            )}

            <Pressable onPress={() => setManualOpen((v) => !v)} accessibilityLabel="Manual entry" className="flex-row items-center bg-cream rounded-2xl px-4 py-3.5 mt-4">
              <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center mr-3">
                <Pencil size={18} color="#f2470c" />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-ink">Manual entry</Text>
                <Text className="text-xs text-muted-foreground">Enter calories and nutrients manually</Text>
              </View>
              <ChevronRight size={20} color="#71717A" />
            </Pressable>
            {manualOpen && (
              <Card style={{ marginTop: 8 }}>
                <Text className="font-bold text-ink mb-2">New meal</Text>
                <TextInput value={name} onChangeText={setName} placeholder="Food name" placeholderTextColor="#A1A1AA" maxLength={80} returnKeyType="next" accessibilityLabel="Food name" className="bg-cream rounded-xl px-3 py-3 mb-2 text-base text-ink" />
                <View className="flex-row mb-2" style={{ gap: 8 }}>
                  <TextInput value={kcal} onChangeText={setKcal} placeholder="kcal *" placeholderTextColor="#A1A1AA" keyboardType="numeric" returnKeyType="next" accessibilityLabel="Calories" className="flex-1 bg-cream rounded-xl px-3 py-3 text-base text-ink" />
                </View>
                <View className="flex-row mb-2" style={{ gap: 8 }}>
                  <TextInput value={protein} onChangeText={setProtein} placeholder="protein g" placeholderTextColor="#A1A1AA" keyboardType="numeric" returnKeyType="next" accessibilityLabel="Protein grams" className="flex-1 bg-cream rounded-xl px-3 py-3 text-base text-ink" />
                  <TextInput value={carbs} onChangeText={setCarbs} placeholder="carbs g" placeholderTextColor="#A1A1AA" keyboardType="numeric" returnKeyType="next" accessibilityLabel="Carbs grams" className="flex-1 bg-cream rounded-xl px-3 py-3 text-base text-ink" />
                  <TextInput value={fat} onChangeText={setFat} placeholder="fat g" placeholderTextColor="#A1A1AA" keyboardType="numeric" returnKeyType="done" accessibilityLabel="Fat grams" className="flex-1 bg-cream rounded-xl px-3 py-3 text-base text-ink" />
                </View>
                <Text className="text-xs font-semibold text-muted-foreground mt-1 mb-1.5">Meal type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12, paddingVertical: 2 }} className="mb-3">
                  {TYPES.map((t) => <Chip key={t} label={t} active={mealType === t} onPress={() => selectMealType(t)} />)}
                </ScrollView>
                {!canSave && <Text className="text-red-500 mb-2">Enter a name and kcal &gt; 0</Text>}
                {saveError ? <Text className="text-red-500 mb-2">{saveError}</Text> : null}
                <PrimaryButton title={saving ? 'Saving…' : 'Save meal'} disabled={!canSave || saving} onPress={handleManualSave} />
              </Card>
            )}
          </View>
        )}
      </ScrollView>
      {sheet && (
        <FoodDetailSheet food={sheet.food} mode={sheet.mode} onClose={() => setSheet(null)} onAdd={onSave} />
      )}
    </View>
  );
}


