import { useState } from 'react';
import { OnboardingProvider } from './OnboardingContext';
import { fetchMe, logout } from '../../lib/authApi';
import { toastError } from '../../utils/toast';
import GenderScreen from './GenderScreen';
import PlanIntroScreen from './PlanIntroScreen';
import BirthdayScreen from './BirthdayScreen';
import CurrentWeightScreen from './CurrentWeightScreen';
import ActivityScreen from './ActivityScreen';
import TargetWeightScreen from './TargetWeightScreen';
import HeightScreen from './HeightScreen';
import GreatChoiceScreen from './GreatChoiceScreen';
import NutritionPlanScreen from './NutritionPlanScreen';
import PaywallScreen from './PaywallScreen';

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
      <StepHost
        step={STEPS[index]}
        onNext={() => setIndex((i) => Math.min(i + 1, STEPS.length - 1))}
        onBack={() => (index === 0 ? exit() : setIndex((i) => i - 1))}
        onDone={finish}
      />
    </OnboardingProvider>
  );
}
