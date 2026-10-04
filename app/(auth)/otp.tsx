import { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { AlertCircle } from 'lucide-react-native'

const OTP_LENGTH = 6
const RESEND_SECONDS = 30

export default function OtpScreen() {
  const { email, mode } = useLocalSearchParams<{ email: string; mode?: string }>()
  const isReset = mode === 'reset'

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendCountdown, setResendCountdown] = useState(RESEND_SECONDS)
  const inputRefs = useRef<TextInput[]>([])

  useEffect(() => {
    if (resendCountdown <= 0) return
    const t = setInterval(() => setResendCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [resendCountdown])

  function handleDigit(index: number, value: string) {
    setError('')
    const digits = value.replace(/\D/g, '')

    if (digits.length > 1) {
      const newCode = Array(OTP_LENGTH).fill('')
      for (let i = 0; i < OTP_LENGTH; i++) newCode[i] = digits[i] ?? ''
      setCode(newCode)
      const nextIndex = Math.min(digits.length, OTP_LENGTH - 1)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    const digit = digits.slice(-1)
    const newCode = [...code]
    newCode[index] = digit
    setCode(newCode)
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !code[index] && index > 0) {
      const newCode = [...code]
      newCode[index - 1] = ''
      setCode(newCode)
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerify() {
    const otp = code.join('')
    if (otp.length < OTP_LENGTH) {
      setError('Enter the full 6-digit code.')
      return
    }
    try {
      setLoading(true)
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email ?? '',
        token: otp,
        type: isReset ? 'email' : 'signup',
      })
      if (verifyError) throw verifyError

      if (isReset) {
        router.replace('/(auth)/reset-password')
      } else {
        // Supabase's identity and user created_at differ by a few ms, so strict
        // equality never matches — treat "created within the last 10 minutes"
        // as a brand-new signup that still needs to pick a role.
        const createdAt = data.user?.created_at ? new Date(data.user.created_at).getTime() : 0
        const isNewSignup = createdAt > 0 && Date.now() - createdAt < 10 * 60 * 1000
        router.replace(isNewSignup ? '/(auth)/role-select' : '/')
      }
    } catch (err: unknown) {
      logger.error('auth', 'otp', err)
      const raw = err instanceof Error ? err.message : ''
      if (raw.toLowerCase().includes('expired')) {
        setError('This code has expired. Request a new one.')
      } else if (raw.toLowerCase().includes('invalid')) {
        setError('Wrong code. Double-check and try again.')
      } else {
        setError('Verification failed. Try requesting a new code.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return
    try {
      if (isReset) {
        const { error: resendError } = await supabase.auth.signInWithOtp({
          email: email ?? '',
          options: { shouldCreateUser: false },
        })
        if (resendError) throw resendError
      } else {
        const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email ?? '' })
        if (resendError) throw resendError
      }
      setResendCountdown(RESEND_SECONDS)
      setError('')
    } catch (err: unknown) {
      logger.error('auth', 'otpResend', err)
      const raw = err instanceof Error ? err.message : ''
      setError(raw || 'Could not resend the code. Please try again.')
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingTop: 48 }} />

      <Text style={{
        fontFamily: 'Syne_700Bold', fontSize: 28,
        letterSpacing: -0.56, lineHeight: 33.6,
        color: colors.text, marginBottom: 12,
      }}>
        {isReset ? 'Enter the code.' : 'Verify your email.'}
      </Text>

      <Text style={{
        fontFamily: 'DMSans_400Regular', fontSize: 15,
        color: colors.textMuted, marginBottom: 40, lineHeight: 22,
      }}>
        We sent a 6-digit code to{' '}
        <Text style={{ color: colors.text, fontFamily: 'DMSans_500Medium' }}>{email}</Text>.
        {isReset ? ' Use it to reset your password.' : ' Use it to finish verifying your account.'}
      </Text>

      {/* OTP inputs */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
        {code.map((digit, i) => (
          <TextInput
            key={i}
            ref={(r) => { if (r) inputRefs.current[i] = r }}
            value={digit}
            onChangeText={(v) => handleDigit(i, v)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={OTP_LENGTH}
            style={{
              width: 44,
              height: 56,
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: error ? colors.ember : digit ? colors.text : colors.border,
              textAlign: 'center',
              fontFamily: 'DMMono_400Regular',
              fontSize: 22,
              color: colors.text,
            }}
          />
        ))}
      </View>

      {/* Inline error */}
      {!!error && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 16 }}>
          <AlertCircle size={15} color={colors.ember} style={{ marginTop: 1 }} />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.ember, flex: 1, lineHeight: 18 }}>
            {error}
          </Text>
        </View>
      )}

      <WButton
        label="Verify"
        variant="dark"
        onPress={handleVerify}
        loading={loading}
        style={{ marginBottom: 24, marginTop: error ? 0 : 24 }}
      />

      {/* Resend */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>
          Didn't get a code?{' '}
          {resendCountdown > 0 ? (
            <Text>
              Resend in{' '}
              <Text style={{ fontFamily: 'DMMono_400Regular', color: colors.text }}>
                {resendCountdown}s
              </Text>
            </Text>
          ) : (
            <Text
              onPress={handleResend}
              style={{ color: colors.text, fontFamily: 'DMSans_500Medium', textDecorationLine: 'underline' }}
            >
              Resend
            </Text>
          )}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{ alignItems: 'center', marginTop: 20 }}
      >
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textDecorationLine: 'underline' }}>
          {isReset ? 'Use a different email' : 'Use a different email'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}
