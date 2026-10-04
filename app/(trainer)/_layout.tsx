import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { Home, CalendarDays, Wallet, UserCircle } from 'lucide-react-native'
import { colors } from '@/lib/theme/colors'
import * as Haptics from 'expo-haptics'

function TabIcon({ focused, label, Icon }: { focused: boolean; label: string; Icon: typeof Home }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3, width: 72 }}>
      <Icon size={22} color={focused ? colors.green : colors.textMuted} strokeWidth={2} />
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: focused ? colors.green : colors.textMuted, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  )
}

export default function TrainerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 76,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Home" Icon={Home} /> }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Bookings" Icon={CalendarDays} /> }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
      <Tabs.Screen
        name="earnings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Earnings" Icon={Wallet} /> }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
      <Tabs.Screen
        name="settings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Profile" Icon={UserCircle} /> }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
      {/* Hidden from tab bar */}
      <Tabs.Screen name="availability" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="notifications" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="booking/[id]" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
  )
}
