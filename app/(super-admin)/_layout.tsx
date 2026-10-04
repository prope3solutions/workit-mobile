import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { ClipboardCheck, Building2, UserCog, Settings } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'

function TabIcon({ focused, label, Icon, colors }: { focused: boolean; label: string; Icon: typeof ClipboardCheck; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 3, width: 72 }}>
      <Icon size={22} color={focused ? colors.green : colors.slate} strokeWidth={2} />
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: focused ? colors.green : colors.slate, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  )
}

export default function SuperAdminLayout() {
  const colors = useColors()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.obsidian,
          borderTopColor: colors.deep,
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
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Approvals" Icon={ClipboardCheck} colors={colors} /> }}
      />
      <Tabs.Screen
        name="gyms"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Gyms" Icon={Building2} colors={colors} /> }}
      />
      <Tabs.Screen
        name="trainers"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Trainers" Icon={UserCog} colors={colors} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Settings" Icon={Settings} colors={colors} /> }}
      />
      {/* Hidden from tab bar */}
      <Tabs.Screen name="gym/[id]" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="create-gym" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="trainer/[id]" options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
    </Tabs>
  )
}
