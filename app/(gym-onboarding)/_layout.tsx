import { Stack } from 'expo-router'

export default function GymOnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="gym-details" />
      <Stack.Screen name="equipment" />
      <Stack.Screen name="plans" />
      <Stack.Screen name="trainers" />
      <Stack.Screen name="payout" />
      <Stack.Screen name="review" />
    </Stack>
  )
}
