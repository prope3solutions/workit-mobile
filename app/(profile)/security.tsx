import React, { useState } from 'react'
import { View, Text, ScrollView, Pressable, Alert } from 'react-native'
import { router } from 'expo-router'
import { makeRedirectUri } from 'expo-auth-session'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, KeyRound, Mail, ChevronRight } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import { logger } from '@/lib/logger'
import { useColors } from '@/lib/theme/colors'

export default function SecurityScreen() {
  const colors = useColors()
  const { user } = useAuth()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const redirectTo = makeRedirectUri({
    scheme: 'workit',
    path: 'auth/callback',
  })

  async function handleSendReset() {
    if (!user?.email) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      setSending(true)
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo,
      })
      if (error) throw error
      setSent(true)
      Alert.alert(
        'Reset email sent',
        `We sent a password reset email to ${user.email}. Check your inbox.`
      )
    } catch (err) {
      logger.error('security', 'resetPassword', err)
      Alert.alert('Error', 'Could not send reset email. Try again.')
    } finally {
      setSending(false)
    }
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
          Password & security
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current email */}
        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: 1, borderColor: colors.border,
          overflow: 'hidden',
          marginBottom: 24,
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            paddingHorizontal: 16, paddingVertical: 15,
          }}>
            <View style={{
              width: 34, height: 34, borderRadius: 10,
              backgroundColor: colors.stone2,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Mail size={16} color={colors.textMuted} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint, marginBottom: 2 }}>
                Account email
              </Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>
                {user?.email ?? '—'}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 64 }} />

          {/* Change password row */}
          <Pressable
            onPress={handleSendReset}
            disabled={sending || sent}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 14,
              paddingHorizontal: 16, paddingVertical: 15,
              backgroundColor: colors.surface,
              opacity: sending ? 0.6 : 1,
            }}
          >
            <View style={{
              width: 34, height: 34, borderRadius: 10,
              backgroundColor: colors.stone2,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <KeyRound size={16} color={colors.textMuted} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>
                Change password
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
                {sent ? 'Reset link sent — check your inbox' : 'Send a reset link to your email'}
              </Text>
            </View>
            {!sent && (
              <ChevronRight size={15} color={colors.textFaint} strokeWidth={2} />
            )}
            {sent && (
              <View style={{
                paddingHorizontal: 8, paddingVertical: 3,
                backgroundColor: `${colors.green}18`, borderRadius: 999,
              }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.greenDeep }}>Sent</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, lineHeight: 20, textAlign: 'center' }}>
          Password resets are sent to your account email. Check your spam folder if you don't see it.
        </Text>
      </ScrollView>
    </View>
  )
}
