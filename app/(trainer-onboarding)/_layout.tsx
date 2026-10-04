import { Stack } from 'expo-router'

export default function TrainerOnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="basic-info" />
      <Stack.Screen name="professional-info" />
      <Stack.Screen name="certifications" />
      <Stack.Screen name="bio" />
      <Stack.Screen name="pricing" />
      <Stack.Screen name="availability" />
      <Stack.Screen name="service-type" />
      <Stack.Screen name="preferred-gyms" />
      <Stack.Screen name="identity" />
      <Stack.Screen name="pending-review" />
    </Stack>
  )
}
