import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

function AuthInput({ value, onChangeText, placeholder, keyboardType, autoCapitalize = 'none', testID, noMargin, secureTextEntry, label, error }) {
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
        className={cn('rounded-btn border-input bg-card text-foreground', noMargin ? null : 'mb-4', error ? 'border-destructive' : null)}
        style={{ height: 72 }}
      />
      {error ? <Text className="text-destructive mt-1">{error}</Text> : null}
    </>
  );
}

export default memo(AuthInput);
