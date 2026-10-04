import { TextInput } from 'react-native';

export default function AuthInput({ value, onChangeText, placeholder, keyboardType, autoCapitalize = 'none', testID, noMargin, secureTextEntry }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#8A8A8A"
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      secureTextEntry={secureTextEntry}
      testID={testID}
      className={`bg-white rounded-2xl border border-black/10 px-6 text-[17px] text-black ${noMargin ? '' : 'mb-4'}`}
      style={{ height: 72 }}
    />
  );
}
