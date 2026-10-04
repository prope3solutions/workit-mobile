import { Alert, Platform } from 'react-native'

// React Native Web's Alert.alert does not support multiple buttons with distinct
// onPress handlers, so confirmation dialogs need a web-specific fallback.
export function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm()
    return
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: title, style: 'destructive', onPress: onConfirm },
  ])
}
