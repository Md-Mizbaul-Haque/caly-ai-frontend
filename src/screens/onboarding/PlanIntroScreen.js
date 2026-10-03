import { Text, View } from 'react-native';
import AuthScaffold from '../../components/auth/AuthScaffold';

export default function PlanIntroScreen({ onNext, onBack }) {
  return (
    <AuthScaffold title="Let's create your plan" subtitle="Your personalized health journey" onBack={onBack}
      ctaLabel="Let's Begin" onCta={onNext}>
      <Text className="text-[19px] text-black leading-[28px] mb-5">We&apos;ll help you reach your health goals by creating a personalized plan based on your unique needs and lifestyle.</Text>
      <Text className="text-[19px] text-black leading-[28px] mb-5">To get started, we&apos;ll ask a few questions about you to customize your nutrition and health recommendations.</Text>
      <Text className="text-[19px] text-black leading-[28px]">Let&apos;s take the first step toward a healthier you!</Text>
      <View />
    </AuthScaffold>
  );
}
