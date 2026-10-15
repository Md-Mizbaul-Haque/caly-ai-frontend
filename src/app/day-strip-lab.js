import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import DaySelector from '../shared/components/dashboard/DaySelector';
import Card from '../shared/components/ui/Card';
import { dateKey } from '../shared/utils/format';

// Dev-only playground for the home day-strip: renders the REAL DaySelector
// with fixture totals so ring/selection bugs reproduce without login,
// backend, or airplane-mode gymnastics. If it reproduces here, the bug is
// in the strip; if not, it's in data fetching (loadWeek / range merge).
// Reachable at /day-strip-lab (dev builds only, no tab entry).
const GOALS = [1500, 2000, 2500];
const ZONES = [undefined, 'UTC', 'Asia/Dhaka'];
const ZONE_LABELS = ['device', 'UTC', 'Asia/Dhaka'];

function keyAt(delta, timeZone) {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return dateKey(d, timeZone);
}

function buildFixtures(kind, timeZone) {
  if (kind === 'empty') return {};
  const eaten = (delta, v) => [keyAt(delta, timeZone), { eaten: v }];
  if (kind === 'past-full') {
    return Object.fromEntries(
      [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0].map((delta, i) => eaten(delta, 1400 + i * 90)),
    );
  }
  // mixed: under / over / full / empty days around today
  return Object.fromEntries([
    eaten(-9, 1800),
    eaten(-6, 2450),
    eaten(-2, 400),
    eaten(-1, 2000),
    eaten(0, 452),
  ]);
}

const FIXTURES = ['mixed', 'past-full', 'empty'];

export default function DayStripLabScreen() {
  const [selected, setSelected] = useState(() => new Date());
  const [goalIx, setGoalIx] = useState(1);
  const [zoneIx, setZoneIx] = useState(0);
  const [fixtureIx, setFixtureIx] = useState(0);
  const goal = GOALS[goalIx];
  const timeZone = ZONES[zoneIx];
  const fixture = FIXTURES[fixtureIx];
  const totalsByDate = useMemo(() => buildFixtures(fixture, timeZone), [fixture, timeZone]);
  const selectedKey = dateKey(selected, timeZone);
  const selectedEaten = (totalsByDate[selectedKey] && totalsByDate[selectedKey].eaten) || 0;

  if (!__DEV__) {
    return (
      <ScrollView className="flex-1 bg-background px-4 pt-12">
        <Card>
          <Text className="font-bold text-ink">Not available</Text>
          <Text className="text-sm text-muted-foreground mt-1">The day-strip lab only exists in dev builds.</Text>
        </Card>
      </ScrollView>
    );
  }

  const knob = (label, value, onPress) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="px-3 py-2 rounded-card border border-border bg-card mr-2 mb-2"
    >
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Text className="text-sm font-bold text-ink">{value}</Text>
    </Pressable>
  );

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 48 }}>
      <Text className="text-2xl font-bold text-ink">Day-strip lab</Text>
      <Text className="text-sm text-muted-foreground mt-1 mb-4">
        Same DaySelector module as Home. Tap pills or use ‹ › to change weeks, flip fixtures.
      </Text>

      <View className="mt-2">
        <DaySelector
          selected={selected}
          onSelect={setSelected}
          totalsByDate={totalsByDate}
          goal={goal}
          timeZone={timeZone}
        />
      </View>

      <Card style={{ marginTop: 16 }}>
        <Text className="font-bold text-ink">Selection readout</Text>
        <Text className="text-sm text-muted-foreground mt-1">key: {selectedKey || '(invalid date)'}</Text>
        <Text className="text-sm text-muted-foreground">eaten: {selectedEaten} / {goal}</Text>
      </Card>

      <Text className="text-base font-bold text-ink mt-6 mb-2">Knobs</Text>
      <View className="flex-row flex-wrap">
        {knob('goal', String(goal), () => setGoalIx((i) => (i + 1) % GOALS.length))}
        {knob('zone', ZONE_LABELS[zoneIx], () => setZoneIx((i) => (i + 1) % ZONES.length))}
        {knob('fixtures', fixture, () => setFixtureIx((i) => (i + 1) % FIXTURES.length))}
        {knob('selection', 'today', () => setSelected(new Date()))}
      </View>
    </ScrollView>
  );
}
