import React, { useState } from 'react'
import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ArrowLeft } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'

type NotifSetting = {
  id: string
  label: string
  sub: string
  value: boolean
}

export default function NotificationsScreen() {
  const colors = useColors()
  const [settings, setSettings] = useState<NotifSetting[]>([
    {
      id: 'email_renewal',
      label: 'Renewal reminders',
      sub: 'Email 7 days before your membership expires',
      value: true,
    },
    {
      id: 'email_checkin',
      label: 'Check-in confirmation',
      sub: 'Email when you check in',
      value: false,
    },
    {
      id: 'push_renewal',
      label: 'Push — Renewal',
      sub: 'Push notification 3 days before expiry',
      value: true,
    },
    {
      id: 'push_activity',
      label: 'Push — Daily plan',
      sub: 'Morning reminder on days you have a plan',
      value: true,
    },
    {
      id: 'push_offers',
      label: 'Push — Gym updates',
      sub: 'New plans, promotions from your gym',
      value: false,
    },
  ])

  function toggle(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSettings(prev =>
      prev.map(s => (s.id === id ? { ...s, value: !s.value } : s))
    )
  }

  async function sendTestNotification() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== Notifications.PermissionStatus.GRANTED) {
      Alert.alert('Permission needed', 'Allow notifications on this device to test push alerts.')
      return
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'WorkIt test notification',
        body: 'If you see this outside the app, push notifications are working.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        repeats: false,
      },
    })

    Alert.alert('Test scheduled', 'A local test notification will fire in 5 seconds.')
  }

  async function resetLocalTestState() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Alert.alert(
      'Reset local test state?',
      'This clears onboarding and local app state on this device only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const keys = [
              'workit.onboarding.seen.v1',
              'workit-theme',
              'workit-weight-goal',
              'workit-activities',
            ]
            await AsyncStorage.multiRemove(keys)
            Alert.alert('Reset complete', 'Restart the app to test the first-run flow again.')
          },
        },
      ]
    )
  }

  const emailSettings = settings.filter(s => s.id.startsWith('email_'))
  const pushSettings = settings.filter(s => s.id.startsWith('push_'))

  function renderGroup(title: string, items: NotifSetting[]) {
    return (
      <View style={{ marginBottom: 24 }}>
        <Text style={{
          fontFamily: 'DMSans_500Medium', fontSize: 11,
          letterSpacing: 0.7, color: colors.textMuted,
          textTransform: 'uppercase', marginBottom: 10,
        }}>
          {title}
        </Text>
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: 1, borderColor: colors.border,
          overflow: 'hidden',
        }}>
          {items.map((item, i) => (
            <View key={item.id}>
              {i > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 16 }} />}
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingHorizontal: 16, paddingVertical: 14,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text, marginBottom: 2 }}>
                    {item.label}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, lineHeight: 18 }}>
                    {item.sub}
                  </Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={() => toggle(item.id)}
                  trackColor={{ false: colors.stone, true: colors.green }}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.stone}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        paddingTop: 60, paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back() }}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: colors.stone2,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ArrowLeft size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, letterSpacing: -0.4, color: colors.text }}>
          Notifications
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {renderGroup('Email', emailSettings)}
        {renderGroup('Push', pushSettings)}

        <View style={{ gap: 12, marginBottom: 24 }}>
          <Pressable
            onPress={sendTestNotification}
            style={({ pressed }) => ({
              minHeight: 54,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.green,
              opacity: pressed ? 0.82 : 1,
            })}
          >
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 15, color: colors.obsidian }}>
              Send test notification
            </Text>
          </Pressable>

          <Pressable
            onPress={resetLocalTestState}
            style={({ pressed }) => ({
              minHeight: 54,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>
              Reset local test state
            </Text>
          </Pressable>
        </View>

        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textFaint, textAlign: 'center', lineHeight: 18 }}>
          Push notifications require permission from your device settings.
        </Text>
      </ScrollView>
    </View>
  )
}
