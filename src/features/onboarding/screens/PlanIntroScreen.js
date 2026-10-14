import { Text, View } from 'react-native';
import { Target } from '../../../shared/components/ui/icons';
import AuthScaffold from '../../../shared/components/auth/AuthScaffold';

export default function PlanIntroScreen({ onNext }) {
  return (
    <AuthScaffold title="Let's create your plan" subtitle="Your personalized health journey"
      ctaLabel="Let's Begin" onCta={onNext}>
      <View className="items-center mt-2 mb-6">
        <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: '#FFF1E9', alignItems: 'center', justifyContent: 'center' }}>
          <Target size={46} color="#f2470c" />
        </View>
      </View>
      <Text className="text-[19px] text-[#1A1A1A] leading-[28px] mb-5">We&apos;ll help you reach your health goals by creating a personalized plan based on your unique needs and lifestyle.</Text>
      <Text className="text-[19px] text-[#1A1A1A] leading-[28px] mb-5">To get started, we&apos;ll ask a few questions about you to customize your nutrition and health recommendations.</Text>
      <Text className="text-[19px] text-[#1A1A1A] leading-[28px]">Let&apos;s take the first step toward a healthier you!</Text>
    </AuthScaffold>
  );
}
