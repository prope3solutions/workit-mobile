import { Stack } from 'expo-router'

export default function ProfileModalLayout() {
  return <Stack screenOptions={{
    headerShown: false,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    gestureDirection: 'horizontal',
    animation: 'slide_from_right',
  }} />
}
