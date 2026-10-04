import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { LayoutDashboard, Users, ScanLine } from 'lucide-react-native'
import { colors } from '@/lib/theme/colors'
import * as Haptics from 'expo-haptics'

function TabIcon({ focused, label, Icon }: { focused: boolean; label: string; Icon: typeof LayoutDashboard }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3, width: 72 }}>
      <Icon size={22} color={focused ? colors.green : colors.textMuted} strokeWidth={2} />
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: focused ? colors.green : colors.textMuted, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  )
}

export default function GymAdminLayout() {
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
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Dashboard" Icon={LayoutDashboard} /> }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
      <Tabs.Screen
        name="members"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Members" Icon={Users} /> }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
      <Tabs.Screen
        name="checkins"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Check-ins" Icon={ScanLine} /> }}
        listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
      />
      {/* Hidden from tab bar */}
      <Tabs.Screen name="member/[id]" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="add-member" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="payouts" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="settings" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
  )
}
