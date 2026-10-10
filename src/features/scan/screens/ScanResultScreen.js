import { useState } from 'react';
import { ScrollView, View, Text, Image, TextInput, Pressable } from 'react-native';
import { ChevronLeft, Flame, Beef, Wheat, Droplet } from '../../../shared/components/ui/icons';
import { uploadMealImage } from '../../../shared/lib/scanApi';
import Card from '../../../shared/components/ui/Card';
import PrimaryButton from '../../../shared/components/ui/Button';
import Chip from '../../../shared/components/ui/Chip';

const TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

/**
 * Scan result page ("new page"):
 * - 'scan' kind: photo preview + one row per AI-detected food with editable kcal/macros.
 * - 'barcode' kind: product info card.
 * User reviews/edits totals, picks a meal type, then confirms -> onSave(meal).
 */
export default function ScanResultScreen({ result, onSave, onClose, onDone }) {
  const close = onClose ?? onDone ?? (() => {});
  const [items, setItems] = useState(() =>
    result.kind === 'barcode' ? [result.item].filter(Boolean) : (result.items ?? [])
  );
  const [type, setType] = useState(() => {
    // Sensible default by time of day; the user can still override.
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return 'Breakfast';
    if (h >= 11 && h < 16) return 'Lunch';
    if (h >= 17 && h < 23) return 'Dinner';
    return 'Snack';
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function toggleItem(idx) {
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, excluded: !it.excluded } : it)));
  }

  const activeItems = items.filter(i => !i.excluded);
  const name = activeItems.map(i => i.name).join(', ').slice(0, 120) || 'Scanned food';
  const activeTotals = items.reduce(
    (acc, i) =>
      i.excluded
        ? acc
        : {
            kcal: acc.kcal + (Number(i.kcal) || 0),
            protein: acc.protein + (Number(i.protein) || 0),
            carbs: acc.carbs + (Number(i.carbs) || 0),
            fat: acc.fat + (Number(i.fat) || 0),
          },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Persist kept photos to Cloudinary so the diary shows them on every
      // device. A failed upload must not lose the meal — save without it.
      let imageUrl;
      if (result.imageUri && result.imageUri.startsWith('file:')) {
        try {
          ({ imageUrl } = await uploadMealImage(result.imageUri));
        } catch {
          imageUrl = undefined;
        }
      }
      const r1 = v => Math.round(Number(v) * 10) / 10;
      await onSave({
        name,
        kcal: Math.round(activeTotals.kcal),
        protein: r1(activeTotals.protein),
        carbs: r1(activeTotals.carbs),
        fat: r1(activeTotals.fat),
        mealType: type,
        ...(imageUrl ? { imageUrl } : {}),
      });
    } catch (e) {
      setSaveError(e.message || 'Could not save this meal.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-12" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="flex-row items-center mb-4">
        <Pressable onPress={close} accessibilityLabel="Back" hitSlop={8} className="mr-3">
          <ChevronLeft size={26} color="#1A1A1A" />
        </Pressable>
        <Text className="text-2xl font-bold text-ink">
          {result.kind === 'barcode' ? 'Product found' : 'Scan complete'}
        </Text>
      </View>

      {result.placeholder && (
        <View className="mb-4 rounded-xl bg-[#FFF4EC] border border-[#FFD9C2] px-3 py-2">
          <Text className="text-xs text-[#B4530A]">
            AI scan unavailable — showing an estimate you can edit. Add OPENAI_API_KEY on the server for real detection.
          </Text>
        </View>
      )}

      {result.kind === 'scan' && result.imageUri && (
        <View className="rounded-card overflow-hidden mb-4" style={{ height: 200 }}>
          <Image source={{ uri: result.imageUri }} className="w-full h-full" resizeMode="cover" />
        </View>
      )}

      <Text className="text-base font-bold text-ink mb-2">
        {result.kind === 'barcode' ? 'Product' : `Detected foods (${items.length})`}
      </Text>
      {result.kind === 'barcode' && items[0] && (
        <Text className="text-xs text-muted-foreground mb-2">
          {items[0].serving
            ? `Nutrition scaled to a ${items[0].serving} serving.`
            : 'Nutrition is per 100g — edit the fields to match your serving.'}
        </Text>
      )}
      {!items.length && (
        <Text className="text-sm text-muted-foreground mb-2">
          Nothing detected — retake the photo with the meal filling the frame.
        </Text>
      )}

      {items.map((item, idx) => (
        <Card key={`${item.name}-${idx}`} style={{ marginBottom: 10, opacity: item.excluded ? 0.45 : 1 }}>
          <Pressable onPress={() => toggleItem(idx)} hitSlop={6}>
            <Text className="font-bold text-ink">{item.excluded ? '🚫 ' : ''}{item.name}{item.serving ? ` — ${item.serving}` : ''}</Text>
          </Pressable>
          <View className="flex-row mt-2" style={{ gap: 8 }}>
            <View className="flex-1">
              <Text className="text-xs text-muted-foreground mb-1">kcal</Text>
              <TextInput
                value={String(item.kcal ?? '')}
                onChangeText={v => updateItem(idx, 'kcal', v.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                className="bg-cream rounded-xl px-3 py-2"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-muted-foreground mb-1">protein g</Text>
              <TextInput
                value={String(item.protein ?? '')}
                onChangeText={v => updateItem(idx, 'protein', v.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                className="bg-cream rounded-xl px-3 py-2"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-muted-foreground mb-1">carbs g</Text>
              <TextInput
                value={String(item.carbs ?? '')}
                onChangeText={v => updateItem(idx, 'carbs', v.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                className="bg-cream rounded-xl px-3 py-2"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-muted-foreground mb-1">fat g</Text>
              <TextInput
                value={String(item.fat ?? '')}
                onChangeText={v => updateItem(idx, 'fat', v.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                className="bg-cream rounded-xl px-3 py-2"
              />
            </View>
          </View>
        </Card>
      ))}

      <Card style={{ marginTop: 4 }}>
        <Text className="font-bold text-ink mb-2">Totals (editable above)</Text>
        <View className="flex-row justify-between">
          <View className="items-center">
            <Flame size={18} color="#f2470c" />
            <Text className="text-lg font-extrabold text-ink">{Math.round(activeTotals.kcal)}</Text>
            <Text className="text-xs text-muted-foreground">kcal</Text>
          </View>
          <View className="items-center">
            <Beef size={18} color="#f2470c" />
            <Text className="text-lg font-extrabold text-ink">{Math.round(activeTotals.protein * 10) / 10}g</Text>
            <Text className="text-xs text-muted-foreground">protein</Text>
          </View>
          <View className="items-center">
            <Wheat size={18} color="#FACC15" />
            <Text className="text-lg font-extrabold text-ink">{Math.round(activeTotals.carbs * 10) / 10}g</Text>
            <Text className="text-xs text-muted-foreground">carbs</Text>
          </View>
          <View className="items-center">
            <Droplet size={18} color="#22C55E" />
            <Text className="text-lg font-extrabold text-ink">{Math.round(activeTotals.fat * 10) / 10}g</Text>
            <Text className="text-xs text-muted-foreground">fat</Text>
          </View>
        </View>
      </Card>

      <Text className="text-base font-bold text-ink mt-4 mb-2">Meal type</Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {TYPES.map(t => (
          <View key={t} style={{ marginRight: 0 }}>
            <Chip label={t} active={type === t} onPress={() => setType(t)} />
          </View>
        ))}
      </View>

      <View className="mt-6 mb-8">
        <PrimaryButton
          title={saving ? 'Saving…' : `Save meal — ${Math.round(activeTotals.kcal)} kcal`}
          disabled={activeTotals.kcal <= 0 || saving || !items.length}
          onPress={handleSave}
        />
        {saveError && (
          <Text className="text-xs text-destructive text-center mt-2">
            {saveError}
          </Text>
        )}
        {activeTotals.kcal <= 0 && (
          <Text className="text-xs text-muted-foreground text-center mt-2">
            Totals are zero — enter estimates in the fields above to save.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
