// A yes/no confirmation that works everywhere. React Native's Alert does nothing
// in a web browser, so on the web we fall back to the browser's own confirm box.
//
//   confirm({ title, message, confirmText: 'Delete', destructive: true, onConfirm })

import { Alert, Platform } from 'react-native';

export function confirm({ title, message, confirmText, destructive = false, onConfirm }) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
