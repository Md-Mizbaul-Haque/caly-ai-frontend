import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Card from '../shared/components/ui/Card';
import PrimaryButton from '../shared/components/ui/Button';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import { Beef, Droplet, Wheat } from '../shared/components/ui/icons';
import { toastSuccess, toastError } from '../shared/utils/toast';
import { updateProfile } from '../shared/lib/authApi';
import { useSession } from '../features/auth/session';

export default function CalorieMacroTargetsScreen() {
  const { goal, setGoal } = useSession();
  const [draft, setDraft] = useState(String(goal ?? 2000));
  const [busy, setBusy] = useState(false);
  const parsed = Number(draft);
  const valid = draft.trim().length > 0 && Number.isFinite(parsed) && parsed >= 500 && parsed <= 10000;

  const macros = [
    { label: 'Protein', grams: Math.round(parsed * 0.25 / 4), color: '#f2470c', Icon: Beef },
    { label: 'Carbs', grams: Math.round(parsed * 0.50 / 4), color: '#E8A317', Icon: Wheat },
    { label: 'Fat', grams: Math.round(parsed * 0.25 / 9), color: '#22C55E', Icon: Droplet },
  ];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Calorie and Macro Targets" subtitle="Adjust your daily goal" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Card>
            <Text className="font-bold text-ink mb-1">Daily goal (kcal)</Text>
            <Text className="text-[13px] text-muted-foreground mb-3">
              Currently {goal} kcal per day
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              keyboardType="numeric"
              accessibilityLabel="Daily calorie goal"
              className="bg-input rounded-xl px-3 py-2.5 text-ink mb-2"
            />
            {!valid && (
              <Text className="text-destructive text-[13px] mb-2">Enter 500–10000 kcal</Text>
            )}
            <PrimaryButton
              title={busy ? 'Saving…' : 'Save goal'}
              disabled={!valid || busy}
              onPress={async () => {
                setBusy(true);
                try {
                  const data = await updateProfile(parsed);
                  setGoal(data.user.dailyGoalKcal);
                  toastSuccess('Goal updated', `${data.user.dailyGoalKcal} kcal per day`);
                } catch (e) {
                  toastError('Could not save goal', e.message);
                } finally {
                  setBusy(false);
                }
              }}
            />
          </Card>

          <Text className="text-[13px] font-semibold text-muted-foreground mt-5 mb-2 px-1 tracking-wide">
            MACRO SPLIT
          </Text>
          <Card>
            {valid ? (
              <View>
                {macros.map((m, i) => (
                  <View key={m.label}>
                    <View className="flex-row items-center py-2.5">
                      <View
                        className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-muted"
                      >
                         <m.Icon size={18} color={m.color} />
                      </View>
                      <Text className="flex-1 text-[15px] font-semibold text-ink">{m.label}</Text>
                      <Text className="text-[15px] font-bold text-ink">{m.grams}g</Text>
                    </View>
                    {i < macros.length - 1 && (
                      <View className="bg-border" style={{ height: 1, marginLeft: 48 }} />
                    )}
                  </View>
                ))}
                <Text className="text-[12px] text-muted-foreground mt-2">
                  Split 25% protein · 50% carbs · 25% fat
                </Text>
              </View>
            ) : (
              <Text className="text-[13px] text-muted-foreground">
                Enter a valid goal above to preview your macro split.
              </Text>
            )}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
