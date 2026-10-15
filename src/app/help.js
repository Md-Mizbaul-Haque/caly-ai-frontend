import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Card from '../shared/components/ui/Card';
import PrimaryButton from '../shared/components/ui/Button';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import { CircleQuestionMark } from '../shared/components/ui/icons';
import { apiPost } from '../shared/lib/api';
import { toastError, toastSuccess } from '../shared/utils/toast';

const FAQS = [
  { q: 'How does calorie tracking work?', a: 'Log meals from the Diary tab or tap + to scan a meal. Caly AI estimates calories and macros automatically.' },
  { q: 'How do I change my daily goal?', a: 'Open More → Weight Tracker and save your target, pace, and activity — the plan computes your new target automatically.' },
  { q: 'Can I log my weight?', a: 'Yes — use the Log Weight button on Progress or the + menu to log a weigh-in. Set your goal under More → Weight Tracker.' },
];

export default function HelpScreen() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const trimmed = message.trim();
  const canSend = trimmed.length >= 5 && !sending;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      await apiPost('/api/support/message', { message: trimmed });
      setMessage('');
      toastSuccess('Message sent', 'Support will get back to you soon');
    } catch (e) {
      toastError('Could not send', e.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Help" subtitle="FAQs and contact support" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Card>
            <View className="flex-row items-center mb-2">
              <View
                className="w-9 h-9 rounded-full items-center justify-center mr-3 bg-muted"
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
                  <View className="bg-border" style={{ height: 1 }} />
                )}
              </View>
            ))}
          </Card>

          <View className="mt-4">
            <Card>
              <Text className="font-bold text-ink mb-1">Still stuck?</Text>
              <Text className="text-[13px] text-muted-foreground mb-3">
                Send us a message and our team will get back to you within one business day.
              </Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message…"
                placeholderTextColor="#A1A1AA"
                multiline
                maxLength={2000}
                accessibilityLabel="Support message"
                className="bg-input rounded-xl px-3 py-3 text-base text-ink"
                style={{ minHeight: 112, textAlignVertical: 'top' }}
              />
              <View className="flex-row items-center justify-between mt-2 mb-3">
                <Text className="text-[12px] text-muted-foreground">
                  {trimmed.length < 5 ? 'At least 5 characters' : ''}
                </Text>
                <Text className="text-[12px] text-muted-foreground">{message.length}/2000</Text>
              </View>
              <PrimaryButton
                title={sending ? 'Sending…' : 'Send message'}
                onPress={handleSend}
                disabled={!canSend}
              />
            </Card>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
