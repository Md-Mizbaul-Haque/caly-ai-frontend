import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

// `rest` is forwarded straight to the underlying TextInput so screens can use
// autofill (autoComplete / textContentType), the keyboard flow (returnKeyType,
// onSubmitEditing) and refs for focus chaining without another prop per case.
// accessibilityLabel falls back to the placeholder: an unlabeled input is
// announced as an empty text field, which is unusable with a screen reader.
function AuthInput({
  value, onChangeText, placeholder, keyboardType, autoCapitalize = 'none',
  testID, noMargin, secureTextEntry, label, error, accessibilityLabel, ...rest
}) {
  return (
    <>
      {label ? <Label className="mb-1 text-foreground">{label}</Label> : null}
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8A8A8A"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        testID={testID}
        accessibilityLabel={accessibilityLabel || placeholder}
        // Email addresses and passwords are never autocorrected or capitalized.
        autoCorrect={false}
        // The inline message sits directly under its field: with the default
        // mb-4 the text read as belonging to the next field instead.
        className={cn('rounded-btn border-input bg-card text-foreground', noMargin ? null : error ? 'mb-1' : 'mb-4', error ? 'border-destructive' : null)}
        style={{ height: 72 }}
        {...rest}
      />
      {error ? <Text className="text-destructive text-[14px] mb-3">{error}</Text> : null}
    </>
  );
}

export default memo(AuthInput);
