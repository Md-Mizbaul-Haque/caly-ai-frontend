import { ScrollView, Text, View } from 'react-native';
import Card from '../shared/components/ui/Card';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import OptionCard from '../shared/components/auth/OptionCard';
import { Moon, Smartphone, Sun } from '../shared/components/ui/icons';
import { useTheme } from '../shared/theme/theme';

const OPTIONS = [
  { key: 'system', title: 'System', subtitle: 'Follow your device setting', Icon: Smartphone },
  { key: 'light', title: 'Light', subtitle: 'Always use the light theme', Icon: Sun },
  { key: 'dark', title: 'Dark', subtitle: 'Always use the dark theme', Icon: Moon },
];

export default function AppearanceScreen() {
  const { choice, setChoice } = useTheme();
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Appearance" subtitle="Light, dark, or system" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Card>
            <View style={{ gap: 12 }}>
              {OPTIONS.map(({ key, title, subtitle, Icon }) => {
                const selected = choice === key;
                return (
                  <OptionCard
                    key={key}
                    title={title}
                    subtitle={subtitle}
                    selected={selected}
                    onPress={() => setChoice(key)}
                    icon={<Icon size={24} color={selected ? '#f2470c' : '#8A8A8A'} />}
                  />
                );
              })}
            </View>
          </Card>
          <Text className="text-[13px] text-muted-foreground mt-4 px-1">
            System follows your device setting and switches automatically.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
