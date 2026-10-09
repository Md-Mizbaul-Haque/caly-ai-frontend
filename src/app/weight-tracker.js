import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import Card from '../shared/components/ui/Card';
import PrimaryButton from '../shared/components/ui/Button';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import { Scale } from '../shared/components/ui/icons';
import { toastSuccess, toastError } from '../shared/utils/toast';
import { fetchWeightGoal, setWeightGoal } from '../shared/lib/weightsApi';
import { MIN_LBS, MAX_LBS, sanitizeDecimalInput, parseWeight, isValidWeight, shouldSendGoal } from '../shared/utils/weightLog';

export default function WeightTrackerScreen() {
  const [goal, setGoal] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetchWeightGoal()
      .then((g) => {
        if (!alive) return;
        setGoal(g);
        if (g != null) setDraft(String(g));
      })
      .catch((e) => {
        if (alive) setError(e.message || 'Could not load your goal.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const parsed = parseWeight(draft);
  const valid = isValidWeight(parsed);
  const unchanged = valid && !shouldSendGoal(draft, goal);
  const canSave = !busy && !loading && shouldSendGoal(draft, goal);

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await setWeightGoal(parsed);
      setGoal(saved);
      setDraft(String(saved));
      toastSuccess('Goal updated', `${saved} lbs target`);
    } catch (e) {
      setError(e.message || 'Could not save goal. Try again.');
      toastError('Could not save goal', e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Weight Tracker" subtitle="Set your weight goal" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          {loading ? (
            <Card>
              <View className="items-center py-4">
                <ActivityIndicator color="#f2470c" />
                <Text className="text-xs text-muted-foreground mt-2">Loading your goal…</Text>
              </View>
            </Card>
          ) : (
            <Card>
              <View className="flex-row items-center mb-1">
                <View className="w-9 h-9 rounded-full items-center justify-center mr-3" style={{ backgroundColor: '#F1E8E0' }}>
                  <Scale size={18} color="#f2470c" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-ink">Weight goal (lbs)</Text>
                  <Text className="text-[13px] text-muted-foreground">
                    {goal != null ? `Currently ${goal} lbs` : 'No goal set yet'}
                  </Text>
                </View>
              </View>
              <TextInput
                value={draft}
                onChangeText={(v) => setDraft(sanitizeDecimalInput(v))}
                keyboardType="decimal-pad"
                placeholder="e.g. 140"
                accessibilityLabel="Weight goal in pounds"
                className="bg-cream rounded-xl px-3 py-2.5 text-ink mb-2 mt-3"
              />
              {draft.trim() !== '' && !valid && (
                <Text className="text-destructive text-[13px] mb-2">Enter a goal between {MIN_LBS}–{MAX_LBS} lbs</Text>
              )}
              {unchanged && (
                <Text className="text-[13px] text-muted-foreground mb-2">This is already your goal.</Text>
              )}
              {error ? <Text className="text-destructive text-[13px] mb-2">{error}</Text> : null}
              <PrimaryButton
                title={busy ? 'Saving…' : 'Save goal'}
                disabled={!canSave}
                onPress={handleSave}
              />
            </Card>
          )}

          <Text className="text-[13px] text-muted-foreground mt-5 px-1">
            Log a weigh-in from Progress or the + button — same-day re-logs replace the previous entry.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
