import { Image, View } from 'react-native';

// Static branded splash shown while the app decides where to route.
// Keep visually identical to SplashOverlay so startup feels continuous.
export default function AppSplash() {
  return (
    <View className="flex-1 bg-white items-center justify-center">
      <Image
        source={require('../../../assets/caly-logo.png')}
        style={{ width: 200, height: 200 }}
        resizeMode="contain"
        accessibilityLabel="Caly AI logo"
      />
    </View>
  );
}
