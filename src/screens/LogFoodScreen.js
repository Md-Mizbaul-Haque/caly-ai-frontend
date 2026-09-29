import { useState } from 'react';
import { ScrollView, TextInput, Text, View } from 'react-native';
import Card from '../components/ui/Card';
import Chip from '../components/ui/Chip';
import PrimaryButton from '../components/ui/Button';
import { estimateMock } from '../lib/mockMeals';
const TYPES = ['Breakfast','Lunch','Dinner','Snack'];
export default function LogFoodScreen({ onSave }) {
  const [aiText, setAiText] = useState('');
  const [est, setEst] = useState(null);
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [type, setType] = useState('Snack');
  const canEstimate = aiText.trim().length > 0;
  const canSave = name.trim().length > 0 && Number(kcal) > 0;
  return (
    <ScrollView className="flex-1 bg-cream px-4 pt-12">
      <Text className="text-2xl font-bold text-ink mb-4">Log food</Text>
      <Card>
        <Text className="font-bold text-ink mb-2">AI estimate (mock v1)</Text>
        <TextInput value={aiText} onChangeText={setAiText} placeholder="e.g. 2 eggs + toast" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        <PrimaryButton title="Estimate" disabled={!canEstimate} onPress={() => setEst(estimateMock(aiText))} />
        {!canEstimate && <Text className="text-muted mt-2">Type a food first to estimate</Text>}
        {est && est.kcal > 0 && <Text className="text-muted mt-2">{est.kcal} kcal • P{est.protein} C{est.carbs} F{est.fat}</Text>}
      </Card>
      <View className="mt-4 mb-24"><Card>
        <Text className="font-bold text-ink mb-2">Manual entry</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Food name" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        <TextInput value={kcal} onChangeText={setKcal} placeholder="kcal" keyboardType="numeric" className="bg-cream rounded-xl px-3 py-2 mb-2" />
        <View className="flex-row mb-4">{TYPES.map(t => <Chip key={t} label={t} active={type===t} onPress={()=>setType(t)} />)}</View>
        {!canSave && <Text className="text-red-500 mb-2">Enter a name and kcal &gt; 0</Text>}
        <PrimaryButton title="Save meal" disabled={!canSave} onPress={() => onSave({ name: name.trim(), kcal: Number(kcal), protein: 0, carbs: 0, fat: 0, mealType: type })} />
      </Card></View>
    </ScrollView>
  );
}
