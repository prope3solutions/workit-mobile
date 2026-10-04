import { useState } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import { formatCurrency } from '@/lib/utils/formatCurrency'

export default function ClaimInviteScreen() {
  const params = useLocalSearchParams<{
    memberName?: string
    gymName?: string
    gymCity?: string
    planName?: string
    planPrice?: string
    inviteToken?: string
    email?: string
  }>()

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const planPrice = params.planPrice ? parseInt(params.planPrice, 10) : 0

  async function handleActivate() {
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.')
      return
    }
    const hasNumber = /\d/.test(password)
    const hasSymbol = /[^a-zA-Z0-9]/.test(password)
    if (!hasNumber || !hasSymbol) {
      Alert.alert('Weak password', 'Include at least one number and one symbol.')
      return
    }
    try {
      setLoading(true)
      // Sign up with the invited email and chosen password
      const { error } = await supabase.auth.signUp({
        email: params.email ?? '',
        password,
        options: {
          data: {
            full_name: params.memberName,
            invite_token: params.inviteToken,
          },
        },
      })
      if (error) throw error
      router.replace('/')
    } catch (err: unknown) {
      logger.error('auth', 'claimInvite', err)
      const message = err instanceof Error ? err.message : 'Could not activate account.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 48 }} />

        {/* Invited badge */}
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#E6FFF2',
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 5,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.green }}>
            Invited
          </Text>
        </View>

        {/* Heading */}
        <Text
          style={{
            fontFamily: 'Syne_700Bold',
            fontSize: 26,
            letterSpacing: -0.52,
            lineHeight: 31.2,
            color: colors.text,
            marginBottom: 6,
          }}
        >
          Welcome, {params.memberName ?? 'there'}.
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: colors.textMuted,
            marginBottom: 28,
          }}
        >
          You're almost in.
        </Text>

        {/* Gym card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            marginBottom: 28,
          }}
        >
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 2 }}>
            {params.gymName ?? 'Your gym'}
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, marginBottom: 16 }}>
            {params.gymCity ?? ''}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textFaint, marginBottom: 2 }}>
                Plan
              </Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>
                {params.planName ?? 'Monthly'}
              </Text>
            </View>
            <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 20, color: colors.text }}>
              {planPrice ? formatCurrency(planPrice) : '—'}
            </Text>
          </View>
        </View>

        {/* Password */}
        <View style={{ marginBottom: 8 }}>
          <WInput
            label="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            hint="8+ characters · one number · one symbol."
          />
        </View>

        <WButton
          label="Activate my account"
          variant="green"
          onPress={handleActivate}
          loading={loading}
          style={{ marginTop: 32 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
