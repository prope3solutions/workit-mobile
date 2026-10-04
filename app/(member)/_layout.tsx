import React, { useMemo } from 'react'
import { Tabs, router, usePathname } from 'expo-router'
import { PanResponder, Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Compass, Dumbbell, Home, User } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'

function TabIcon({
  focused,
  Icon,
}: {
  focused: boolean
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>
}) {
  const colors = useColors()
  return (
    <Icon
      size={22}
      color={focused ? colors.green : colors.textMuted}
      strokeWidth={2}
    />
  )
}

export default function MemberLayout() {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const isRootTab = ['/', '/my-gym', '/discover', '/profile'].includes(pathname)
  const edgeSwipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => (
      Platform.OS === 'ios'
      && !isRootTab
      && gesture.x0 <= 24
      && gesture.dx > 8
      && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4
    ),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 72 && gesture.vx > 0.1 && router.canGoBack()) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        router.back()
      }
    },
  }), [isRootTab])

  return (
    <View style={{ flex: 1 }} {...edgeSwipe.panHandlers}>
      <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 7,
        },
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarAllowFontScaling: false,
        tabBarLabelPosition: 'below-icon',
        tabBarLabelStyle: {
          fontFamily: 'DMSans_500Medium',
          fontSize: 10,
          lineHeight: 13,
          marginTop: 2,
        },
        tabBarIconStyle: { marginTop: 0 },
        tabBarItemStyle: { flex: 1, minWidth: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={Home} />
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="my-gym"
        options={{
          title: 'My Gym',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={Dumbbell} />
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={Compass} />
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={User} />
          ),
        }}
        listeners={{
          tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />

      {/* Hidden screens — no tab bar, no tab button slot (tabBarItemStyle needed on web) */}
      <Tabs.Screen name="notifications"    options={{ href: null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="activity"         options={{ href: null, tabBarItemStyle: { display: 'none' } }} />
      <Tabs.Screen name="checkin"          options={{ href: null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="request-gym"       options={{ href: null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="gym/[id]"         options={{ href: null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="payment-success"  options={{ href: null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="activity-edit"    options={{ href: null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="trainers/index"   options={{ href: null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="trainers/[id]"    options={{ href: null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="trainers/book/[trainerId]" options={{ href: null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="trainers/book/confirm"     options={{ href: null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="trainers/review/[bookingId]" options={{ href: null, tabBarItemStyle: { display: 'none' }, tabBarStyle: { display: 'none' } }} />
      </Tabs>
    </View>
  )
}
