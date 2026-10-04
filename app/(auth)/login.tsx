import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
} from 'react-native'
import { Link, router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import AppleSvg from '@/assets/cards icon/apple-svgrepo-com.svg'
import GoogleSvg from '@/assets/cards icon/google-icon-svgrepo-com.svg'
import { AlertCircle } from 'lucide-react-native'
import { isNewOAuthUser, signInWithGoogle } from '@/lib/auth/googleOAuth'

function getErrorMessage(raw: string): string {
  const msg = raw.toLowerCase()
  if (msg.includes('invalid login') || msg.includes('invalid credentials') || msg.includes('wrong password') || msg.includes('incorrect password')) {
    return 'Wrong password. Double-check and try again.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Please verify your email before signing in.'
  }
  if (msg.includes('user not found') || msg.includes('no user')) {
    return 'No account found with that email.'
  }
  if (msg.includes('too many')) {
    return 'Too many attempts. Wait a moment and try again.'
  }
  return 'Something went wrong. Please try again.'
}

function isEmailNotConfirmed(raw: string): boolean {
  return raw.toLowerCase().includes('email not confirmed')
}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [failCount, setFailCount] = useState(0)

  async function handleLogin() {
    setError('')
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }
    try {
      setLoading(true)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (authError) throw authError
      setFailCount(0)
      router.replace('/')
    } catch (err: unknown) {
      logger.error('auth', 'login', err)
      const raw = err instanceof Error ? err.message : ''

      // Supabase deliberately refuses password sign-in until the email is
      // confirmed. Make that failure recoverable and idempotent: every tap
      // requests the current verification email and takes the user to the
      // same OTP flow, instead of leaving them at a dead-end error.
      if (isEmailNotConfirmed(raw)) {
        const normalizedEmail = email.trim().toLowerCase()
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: normalizedEmail,
        })

        if (!resendError) {
          setFailCount(0)
          router.push({ pathname: '/(auth)/otp', params: { email: normalizedEmail, mode: 'verify' } })
          return
        }

        logger.error('auth', 'verificationResendAfterLogin', resendError)
        const resendMessage = resendError.message.toLowerCase().includes('too many')
          ? 'A verification code was recently sent. Check your inbox or spam folder, then enter it here.'
          : 'We could not resend the verification code. Please try again in a moment.'
        setError(resendMessage)
        setFailCount(prev => prev + 1)
        return
      }

      const friendly = getErrorMessage(raw)
      setError(friendly)
      setFailCount(prev => prev + 1)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    try {
      setLoading(true)
      const session = await signInWithGoogle()
      if (!session) return
      router.replace(isNewOAuthUser(session.user.created_at) ? '/(auth)/role-select' : '/')
    } catch (err: unknown) {
      logger.error('auth', 'googleLogin', err)
      const raw = err instanceof Error ? err.message : ''
      setError(raw || 'Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const showForgotNudge = failCount >= 3

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

        <Text style={{
          fontFamily: 'Syne_700Bold', fontSize: 28,
          letterSpacing: -0.56, color: colors.text, marginBottom: 32,
        }}>
          Welcome back.
        </Text>

        <View style={{ gap: 16, marginBottom: 12 }}>
          <WInput
            label="Email"
            value={email}
            onChangeText={(t) => { setEmail(t); setError('') }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@email.com"
          />
          <WInput
            label="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); setError('') }}
            secureTextEntry
            placeholder="Min. 8 characters"
          />
        </View>

        {/* Inline error */}
        {!!error && (
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 8,
            marginBottom: 16, marginTop: 4,
          }}>
            <AlertCircle size={15} color={colors.ember} style={{ marginTop: 1 }} />
            <Text style={{
              fontFamily: 'DMSans_400Regular', fontSize: 13,
              color: colors.ember, flex: 1, lineHeight: 18,
            }}>
              {error}
            </Text>
          </View>
        )}

        {/* Forgot password row */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password')}
          style={{ alignSelf: 'flex-end', marginBottom: 24 }}
        >
          <Text style={{
            fontFamily: showForgotNudge ? 'DMSans_500Medium' : 'DMSans_400Regular',
            fontSize: 14,
            color: showForgotNudge ? colors.text : colors.textMuted,
            textDecorationLine: showForgotNudge ? 'underline' : 'none',
          }}>
            {showForgotNudge ? 'Forgot your password?' : 'Forgot password?'}
          </Text>
        </TouchableOpacity>

        <WButton label="Sign in" variant="dark" onPress={handleLogin} loading={loading} />

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        {/* Social auth */}
        <View style={{ gap: 12 }}>
          <WButton
            label="Continue with Apple"
            variant="outline"
            onPress={() => {}}
            icon={<AppleSvg width={24} height={24} />}
          />
          <WButton
            label="Continue with Google"
            variant="outline"
            onPress={handleGoogleLogin}
            disabled={loading}
            icon={<GoogleSvg width={20} height={20} />}
          />
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 40, gap: 4 }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>
            New here?
          </Text>
          <Link href="/(auth)/register">
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text, textDecorationLine: 'underline' }}>
              Create account
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
