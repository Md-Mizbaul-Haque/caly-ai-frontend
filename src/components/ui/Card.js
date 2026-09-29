import { View } from 'react-native';
export default function Card({ children, style }) {
  return (
    <View className="bg-white rounded-card p-4 border border-[#F1E8E0]" style={[{ shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }, style]}>
      {children}
    </View>
  );
}
