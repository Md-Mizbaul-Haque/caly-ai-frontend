import Toast from 'react-native-toast-message';

const SUCCESS_MS = 2200;
const FAILURE_MS = 3500;

export function toastSuccess(text1, text2) {
  Toast.show({ type: 'success', text1, text2, visibilityTime: SUCCESS_MS });
}

export function toastError(text1, text2) {
  Toast.show({ type: 'error', text1, text2, visibilityTime: FAILURE_MS });
}

export function toastInfo(text1, text2) {
  Toast.show({ type: 'info', text1, text2, visibilityTime: SUCCESS_MS });
}
