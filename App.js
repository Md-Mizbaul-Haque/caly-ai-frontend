import './global.css';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold">Caly AI — frontend ready 🎉</Text>
      <Text className="mt-2 text-gray-500">NativeWind + Expo + API: see lib/api.js</Text>
      <StatusBar style="auto" />
    </View>
  );
}
