import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/theme/theme';

export default function WelcomeScreen({ onLogin, onRegister }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  return (
    <View className="flex-1 bg-background px-6" style={{ paddingBottom: Math.max(insets.bottom, 32) + 12 }}>
      <View className="flex-1 items-center justify-center">
        <Image
          source={require('../../../../assets/caly-logo.png')}
          style={{ width: 200, height: 200 }}
          resizeMode="contain"
          accessibilityLabel="Caly AI logo"
        />
        <Text style={{ fontSize: 52, fontWeight: '800', letterSpacing: -1, marginTop: 12 }}>
          <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>CALY</Text>
          <Text style={{ color: '#f2470c' }}> AI</Text>
        </Text>
      </View>
      <View style={{ gap: 16, paddingBottom: 12 }}>
        <Pressable
          onPress={onLogin}
          testID="welcome-login"
          accessibilityRole="button"
          className="rounded-btn bg-primary items-center justify-center py-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
        >
          <Text className="text-white text-lg font-bold">Login</Text>
        </Pressable>
        <Pressable
          onPress={onRegister}
          testID="welcome-register"
          accessibilityRole="button"
          className="rounded-btn items-center justify-center bg-card border border-border py-3"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text className="text-ink text-lg font-bold">Register</Text>
        </Pressable>
      </View>
    </View>
  );
}
