import { Text, View } from 'react-native';
import { Target } from 'lucide-react-native';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';

export default function PlanIntroScreen({ onNext, onBack }) {
  return (
    <AuthScaffold title="Let's create your plan" subtitle="Your personalized health journey" onBack={onBack}
      ctaLabel="Let's Begin" onCta={onNext}>
      <View className="items-center mt-2 mb-6">
        <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: '#FFF1E9', alignItems: 'center', justifyContent: 'center' }}>
          <Target size={46} color="#FF6B35" />
        </View>
      </View>
      <Text className="text-[19px] text-[#1A1A1A] leading-[28px] mb-5">We&apos;ll help you reach your health goals by creating a personalized plan based on your unique needs and lifestyle.</Text>
      <Text className="text-[19px] text-[#1A1A1A] leading-[28px] mb-5">To get started, we&apos;ll ask a few questions about you to customize your nutrition and health recommendations.</Text>
      <Text className="text-[19px] text-[#1A1A1A] leading-[28px]">Let&apos;s take the first step toward a healthier you!</Text>
    </AuthScaffold>
  );
}
