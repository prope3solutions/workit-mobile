import React from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, User, Mail, Phone } from 'lucide-react-native'
import { useAuth } from '@/lib/hooks/useAuth'
import { useColors } from '@/lib/theme/colors'

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>
  label: string
  value: string
}) {
  const colors = useColors()
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 16, paddingVertical: 15,
    }}>
      <View style={{
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: colors.stone2,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} color={colors.textMuted} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint, marginBottom: 2, letterSpacing: 0.3 }}>
          {label}
        </Text>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>
          {value}
        </Text>
      </View>
    </View>
  )
}

export default function AccountInfoScreen() {
  const colors = useColors()
  const { user } = useAuth()

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
          Account info
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: 1, borderColor: colors.border,
          overflow: 'hidden',
          marginBottom: 24,
        }}>
          <InfoRow
            icon={User}
            label="Full name"
            value={user?.full_name ?? '—'}
          />
          <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 64 }} />
          <InfoRow
            icon={Mail}
            label="Email"
            value={user?.email ?? '—'}
          />
          <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 64 }} />
          <InfoRow
            icon={Phone}
            label="Phone"
            value={user?.phone ?? '—'}
          />
        </View>

        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, lineHeight: 20, textAlign: 'center' }}>
          To update your name or phone number, tap Edit on your profile.
        </Text>
      </ScrollView>
    </View>
  )
}
