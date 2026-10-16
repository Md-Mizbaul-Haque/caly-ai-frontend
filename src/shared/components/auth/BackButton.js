import { memo } from 'react';
import { Pressable } from 'react-native';
import { ChevronLeft } from '../ui/icons';
import { INK } from '../../theme/colors';

// Top-left back affordance for auth + onboarding screens (OS back alone is
// undiscoverable, and iOS has no hardware back button). Screens opt in via
// onBack; entry screens (welcome, first onboarding step) pass none.
function BackButton({ onPress, label = 'Go back' }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      className="w-11 h-11 rounded-full border border-border bg-card items-center justify-center mb-4"
    >
      <ChevronLeft size={22} color={INK} />
    </Pressable>
  );
}

export default memo(BackButton);
