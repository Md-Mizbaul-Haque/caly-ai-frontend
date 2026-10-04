import { useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { OnboardingProvider } from '../../features/onboarding/OnboardingContext';
import { fetchMe, logout } from '../../shared/lib/authApi';
import { toastError } from '../../shared/utils/toast';
import GenderScreen from '../../features/onboarding/screens/GenderScreen';
import PlanIntroScreen from '../../features/onboarding/screens/PlanIntroScreen';
import BirthdayScreen from '../../features/onboarding/screens/BirthdayScreen';
import CurrentWeightScreen from '../../features/onboarding/screens/CurrentWeightScreen';
import ActivityScreen from '../../features/onboarding/screens/ActivityScreen';
import TargetWeightScreen from '../../features/onboarding/screens/TargetWeightScreen';
import HeightScreen from '../../features/onboarding/screens/HeightScreen';
import GreatChoiceScreen from '../../features/onboarding/screens/GreatChoiceScreen';
import NutritionPlanScreen from '../../features/onboarding/screens/NutritionPlanScreen';
import PaywallScreen from '../../features/onboarding/screens/PaywallScreen';

const STEPS = ['gender', 'planIntro', 'birthday', 'currentWeight', 'activity', 'targetWeight', 'height', 'greatChoice', 'nutritionPlan', 'paywall'];

function StepHost({ step, onNext, onBack, onDone }) {
  switch (step) {
    case 'gender': return <GenderScreen onNext={onNext} onBack={onBack} />;
    case 'planIntro': return <PlanIntroScreen onNext={onNext} onBack={onBack} />;
    case 'birthday': return <BirthdayScreen onNext={onNext} onBack={onBack} />;
    case 'currentWeight': return <CurrentWeightScreen onNext={onNext} onBack={onBack} />;
    case 'activity': return <ActivityScreen onNext={onNext} onBack={onBack} />;
    case 'targetWeight': return <TargetWeightScreen onNext={onNext} onBack={onBack} />;
    case 'height': return <HeightScreen onNext={onNext} onBack={onBack} />;
    case 'greatChoice': return <GreatChoiceScreen onNext={onNext} onBack={onBack} />;
    case 'nutritionPlan': return <NutritionPlanScreen onNext={onNext} onBack={onBack} />;
    case 'paywall': return <PaywallScreen onDone={onDone} />;
    default: return null;
  }
}

function FadeStep({ stepKey, children }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    opacity.setValue(0);
    const anim = Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [stepKey, opacity]);
  return <Animated.View style={{ flex: 1, opacity }}>{children}</Animated.View>;
}

export default function OnboardingWizard({ email, onComplete, onExit }) {
  const [index, setIndex] = useState(0);
  async function finish() {
    try {
      const { user } = await fetchMe();
      onComplete(user);
    } catch (e) {
      toastError('Could not load profile', e.message);
    }
  }
  async function exit() {
    try { await logout(); } finally { onExit(); }
  }
  return (
    <OnboardingProvider email={email}>
      <FadeStep stepKey={STEPS[index]}>
        <StepHost
          step={STEPS[index]}
          onNext={() => setIndex((i) => Math.min(i + 1, STEPS.length - 1))}
          onBack={() => (index === 0 ? exit() : setIndex((i) => i - 1))}
          onDone={finish}
        />
      </FadeStep>
    </OnboardingProvider>
  );
}
