import { useState } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { makeRedirectUri } from 'expo-auth-session'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import { AlertCircle, ChevronLeft } from 'lucide-react-native'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const redirectTo = makeRedirectUri({
    scheme: 'workit',
    path: 'auth/callback',
  })

  async function handleSendCode() {
    setError('')
    if (!email.trim()) {
      setError('Enter the email on your WorkIt account.')
      return
    }
    if (!email.includes('@')) {
      setError("That doesn't look like a valid email.")
      return
    }
    try {
      setLoading(true)
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      })
      if (authError) throw authError
      router.push({ pathname: '/(auth)/otp', params: { email: email.trim().toLowerCase(), mode: 'reset' } })
    } catch (err: unknown) {
      logger.error('auth', 'forgotPassword', err)
      const raw = err instanceof Error ? err.message : ''
      if (raw.toLowerCase().includes('user not found') || raw.toLowerCase().includes('no user')) {
        setError("We don't have an account with that email.")
      } else {
        setError("Couldn't send the reset email. Try again in a moment.")
      }
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
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 56, marginBottom: 32, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4 }}
          hitSlop={12}
        >
          <ChevronLeft size={18} color={colors.textMuted} strokeWidth={1.8} />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>Back</Text>
        </TouchableOpacity>

        <Text style={{
          fontFamily: 'Syne_700Bold', fontSize: 28,
          letterSpacing: -0.56, color: colors.text, marginBottom: 8,
        }}>
          Forgot your{'\n'}password?
        </Text>
        <Text style={{
          fontFamily: 'DMSans_400Regular', fontSize: 15,
          color: colors.textMuted, lineHeight: 22, marginBottom: 40,
        }}>
          Enter your email and we'll send a 6-digit code to reset it.
        </Text>

        <View style={{ marginBottom: error ? 12 : 32 }}>
          <WInput
            label="Email"
            value={email}
            onChangeText={(t) => { setEmail(t); setError('') }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@email.com"
          />
        </View>

        {!!error && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 24 }}>
            <AlertCircle size={15} color={colors.ember} style={{ marginTop: 1 }} />
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.ember, flex: 1, lineHeight: 18 }}>
              {error}
            </Text>
          </View>
        )}

        <WButton
          label="Send code"
          variant="dark"
          onPress={handleSendCode}
          loading={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
