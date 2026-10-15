import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useSession } from '../../auth/session';
import { exportMyData } from '../../../shared/lib/exportCsv';
import { toastError, toastSuccess } from '../../../shared/utils/toast';
import { effectiveTimeZone } from '../../../shared/utils/format';
import {
  BookOpen, CircleQuestionMark, Download, LogOut, Newspaper, Rocket, Scale,
  Share2, Utensils,
} from '../../../shared/components/ui/icons';
import MenuRow, { MenuGroup } from '../components/MenuRow';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

function SectionLabel({ children }) {
  return (
    <Text className="text-[13px] font-semibold text-muted-foreground mb-2 mt-5 px-1 tracking-wide">
      {children}
    </Text>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { user, handleLogout, authChecked } = useSession();
  const [exporting, setExporting] = useState(false);

  if (!authChecked) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}>
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Text className="text-lg font-bold text-ink">More</Text>
          {/* Skeleton for profile header */}
          <View className="bg-card rounded-card border border-border px-4 py-4 flex-row items-center mt-4" style={{
            shadowColor: '#1A1A1A',
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 2,
          }}>
            <View className="w-14 h-14 rounded-full items-center justify-center" style={{ backgroundColor: '#f2470c' }}>
              <Text className="text-white text-2xl font-extrabold">Skeleton</Text>
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-[17px] font-bold text-ink">Skeleton</Text>
              <Text className="text-[13px] text-muted-foreground">Skeleton</Text>
            </View>
          </View>
          {/* We could add more skeletons for the rest of the screen, but for simplicity, we just show the profile header skeleton and hide the rest until loaded */}
          <View className="mt-6">
            <Text className="text-[13px] text-muted-foreground">Loading...</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  const name = user?.name || 'Welcome';
  const email = user?.email || '';
  const initial = (name.trim()[0] || 'C').toUpperCase();

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const { meals, weights, files } = await exportMyData({ timeZone: effectiveTimeZone(user) });
      const parts = [];
      if (meals) parts.push(`${meals} meal${meals === 1 ? '' : 's'}`);
      if (weights) parts.push(`${weights} weigh-in${weights === 1 ? '' : 's'}`);
      const names = (files || []).map((f) => f.name).join(', ');
      toastSuccess('Saved to your phone', `${parts.join(' and ')} from the last 90 days${names ? ` — ${names}` : ''}`);
    } catch (e) {
      toastError('Export failed', e.message || 'Could not export your data.');
    } finally {
      setExporting(false);
    }
  }

  async function handleShareApp() {
    try {
      await Share.share({
        message: 'Track calories with me on Caly AI — scan meals, hit your macros, and build streaks!',
      });
    } catch (e) {
      toastError('Could not share', e.message);
    }
  }

  function confirmSignOut() {
    Alert.alert('Sign out', 'You will need to sign back in to keep your streak going.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await handleLogout();
          } catch (e) {
            // Optional: show a toast or log the error
            console.error('Sign out failed', e);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}>
      <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        <Text className="text-lg font-bold text-ink">More</Text>

        {/* Profile header — tappable, opens the Profile screen */}
        <Pressable
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          className="mt-4"
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <View
            className="bg-card rounded-card border border-border px-4 py-4 flex-row items-center"
            style={{
              shadowColor: '#1A1A1A',
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 2,
            }}
          >
            <View className="w-14 h-14 rounded-full items-center justify-center" style={{ backgroundColor: '#f2470c' }}>
              <Text className="text-white text-2xl font-extrabold">{initial}</Text>
            </View>
            <View className="flex-1 ml-3">
              <Text className="text-[17px] font-bold text-ink" numberOfLines={1}>{name}</Text>
              <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>{email || 'View your profile and daily goal'}</Text>
            </View>
          </View>
        </Pressable>

        <SectionLabel>Tracking</SectionLabel>
        <MenuGroup>
          <MenuRow icon={Scale} label="Weight Tracker" description="Set your weight goal" onPress={() => router.push('/weight-tracker')} />
          <MenuRow icon={Utensils} label="Favorites, Foods, and Recipes" description="Quickly re-log what you eat often" onPress={() => router.push('/favorites')} />
          <MenuRow icon={BookOpen} label="Find Recipes" description="Meals that fit your remaining calories" onPress={() => router.push('/find-recipes')} />
        </MenuGroup>

        <SectionLabel>Your Data</SectionLabel>
        <MenuGroup>
          <MenuRow icon={Download} label={exporting ? 'Preparing export…' : 'Export My Data'} description="Saved to your phone as CSV files" onPress={handleExport} last />
        </MenuGroup>

        <SectionLabel>Support</SectionLabel>
        <MenuGroup>
          <MenuRow icon={Newspaper} label={"What's New"} description="Latest updates and fixes" onPress={() => router.push('/whats-new')} />
          <MenuRow icon={Rocket} label="Snappy Early Access" description="Try new features before anyone else" onPress={() => router.push('/snappy-early-access')} />
          <MenuRow icon={CircleQuestionMark} label="Help" description="FAQs and contact support" onPress={() => router.push('/help')} />
          <MenuRow icon={Share2} label="Share Caly AI" description="Tell a friend about the app" onPress={handleShareApp} />
        </MenuGroup>

        <SectionLabel>Account</SectionLabel>
        <MenuGroup>
          <MenuRow icon={LogOut} label="Sign out" danger onPress={confirmSignOut} last />
        </MenuGroup>

        <Text className="text-center text-[12px] text-muted-foreground mt-6">Caly AI v{APP_VERSION}</Text>
      </View>
    </ScrollView>
  );
}
