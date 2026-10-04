import '../global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import {
  Syne_700Bold,
  Syne_800ExtraBold,
} from '@expo-google-fonts/syne'
import {
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans'
import {
  DMMono_400Regular,
} from '@expo-google-fonts/dm-mono'
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useColorScheme, ActivityIndicator, View } from 'react-native'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useColors } from '@/lib/theme/colors'
import { useThemeStore } from '@/lib/stores/themeStore'
import { initializeTelemetry } from '@/lib/telemetry'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
})

function AppShell() {
  const colors = useColors()
  const preference = useThemeStore((s) => s.preference)
  const system = useColorScheme()
  const isDark = preference === 'dark' || (preference === 'system' && system === 'dark')

  const [fontsLoaded] = useFonts({
    Syne_700Bold,
    Syne_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMMono_400Regular,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.obsidian }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        gestureDirection: 'horizontal',
        animation: 'slide_from_right',
      }}>
        <Stack.Screen name="(member)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(gym-onboarding)" />
        <Stack.Screen name="(gym-admin)" />
        <Stack.Screen name="(trainer-onboarding)" />
        <Stack.Screen name="(super-admin)" />
      </Stack>
    </>
  )
}

function RootLayout() {
  useEffect(() => { initializeTelemetry() }, [])
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppShell />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export default RootLayout
