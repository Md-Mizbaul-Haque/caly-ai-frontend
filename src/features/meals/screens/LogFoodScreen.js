import { useState } from 'react';
import { ScrollView, TextInput, Text, View, Image, Pressable } from 'react-native';
import { X } from '../../../shared/components/ui/icons';
import Card from '../../../shared/components/ui/Card';
import Chip from '../../../shared/components/ui/Chip';
import PrimaryButton from '../../../shared/components/ui/Button';
const TYPES = ['Breakfast','Lunch','Dinner','Snack'];
export default function LogFoodScreen({ onSave, photo = null, onRemovePhoto }) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [type, setType] = useState('Snack');
  const canSave = name.trim().length > 0 && Number(kcal) > 0;
  return (
    <ScrollView className="flex-1 bg-white px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Log food</Text>
      {photo && (
        <View className="mb-4">
          <View className="rounded-card overflow-hidden" style={{ height: 180 }}>
            <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
          </View>
          <Pressable
            onPress={onRemovePhoto}
            accessibilityLabel="Remove photo"
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
          >
            <X size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
      <View className="mt-4 mb-24"><Card>
        <Text className="font-bold text-ink mb-2">Manual entry</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Food name" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        <TextInput value={kcal} onChangeText={setKcal} placeholder="kcal" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        <TextInput value={protein} onChangeText={setProtein} placeholder="protein g" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        <TextInput value={carbs} onChangeText={setCarbs} placeholder="carbs g" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        <TextInput value={fat} onChangeText={setFat} placeholder="fat g" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        <View className="flex-row mb-4">{TYPES.map(t => <Chip key={t} label={t} active={type===t} onPress={()=>setType(t)} />)}</View>
        {!canSave && <Text className="text-red-500 mb-2">Enter a name and kcal &gt; 0</Text>}
        <PrimaryButton title="Save meal" disabled={!canSave} onPress={() => onSave({ name: name.trim(), kcal: Number(kcal), protein: Number(protein) || 0, carbs: Number(carbs) || 0, fat: Number(fat) || 0, mealType: type, ...(photo ? { imageUrl: photo } : {}) })} />
      </Card></View>
    </ScrollView>
  );
}
