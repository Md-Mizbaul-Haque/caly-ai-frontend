import { ScrollView, Text, View } from 'react-native';
import Card from '../shared/components/ui/Card';
import PrimaryButton from '../shared/components/ui/Button';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import { CircleQuestionMark } from '../shared/components/ui/icons';
import { toastSuccess } from '../shared/utils/toast';

const FAQS = [
  { q: 'How does calorie tracking work?', a: 'Log meals from the Diary tab or tap + to scan a meal. Caly AI estimates calories and macros automatically.' },
  { q: 'How do I change my daily goal?', a: 'Open More → Calorie and Macro Targets and save a new goal between 500 and 10000 kcal.' },
  { q: 'Can I log my weight?', a: 'Yes — use More → Weight Tracker or the + button on the Home tab to log a weigh-in and see your trend.' },
];

export default function HelpScreen() {
  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Help" subtitle="FAQs and contact support" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Card>
            <View className="flex-row items-center mb-2">
              <View
                className="w-9 h-9 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: '#F1E8E0' }}
              >
                 <CircleQuestionMark size={18} color="#f2470c" />
              </View>
              <Text className="text-[15px] font-bold text-ink">Frequently asked</Text>
            </View>
            {FAQS.map((f, i) => (
              <View key={f.q}>
                <View className="py-2.5">
                  <Text className="text-[15px] font-semibold text-ink mb-0.5">{f.q}</Text>
                  <Text className="text-[13px] text-muted-foreground">{f.a}</Text>
                </View>
                {i < FAQS.length - 1 && (
                  <View style={{ height: 1, backgroundColor: '#F1E8E0' }} />
                )}
              </View>
            ))}
          </Card>

          <View className="mt-4">
            <Card>
              <Text className="font-bold text-ink mb-1">Still stuck?</Text>
              <Text className="text-[13px] text-muted-foreground mb-3">
                Our support team replies within one business day.
              </Text>
              <PrimaryButton
                title="Contact support"
                onPress={() => toastSuccess('Message sent', 'Support will get back to you soon')}
              />
            </Card>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
