import { ScrollView, Share, Text, View } from 'react-native';
import Card from '../shared/components/ui/Card';
import PrimaryButton from '../shared/components/ui/Button';
import ScreenHeader from '../shared/components/ui/ScreenHeader';
import { TicketPercent } from '../shared/components/ui/icons';
import { toastSuccess, toastError } from '../shared/utils/toast';
import { useSession } from '../features/auth/session';

function codeFor(user) {
  const base = (user?.name || user?.email || 'CALY')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
  return `${base || 'CALY'}-FRIEND`;
}

export default function ReferralCodeScreen() {
  const { user } = useSession();
  const code = codeFor(user);

  async function share() {
    try {
      await Share.share({ message: `Track calories with me on Caly AI! Use my referral code: ${code}` });
    } catch (e) {
      toastError('Could not share', e.message);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScreenHeader title="Referral Code" subtitle="Share Caly AI with a friend" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 }}
      >
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Card>
            <View className="items-center py-4">
              <View
                className="w-14 h-14 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: '#F1E8E0' }}
              >
                 <TicketPercent size={24} color="#f2470c" />
              </View>
              <Text className="text-[13px] text-muted-foreground mb-1">Your personal code</Text>
              <Text className="text-2xl font-extrabold text-ink tracking-widest mb-1">{code}</Text>
              <Text className="text-[13px] text-muted-foreground text-center mb-4">
                Friends who sign up with your code get started faster — and so do you.
              </Text>
              <View className="w-full">
                <PrimaryButton
                  title="Share code"
                  onPress={async () => {
                    await share();
                    toastSuccess('Thanks for sharing!', code);
                  }}
                />
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
