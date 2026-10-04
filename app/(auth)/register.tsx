import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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

function InlineError({ message }: { message: string }) {
  if (!message) return null
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4, marginBottom: 8 }}>
      <AlertCircle size={15} color={colors.ember} style={{ marginTop: 1 }} />
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.ember, flex: 1, lineHeight: 18 }}>
        {message}
      </Text>
    </View>
  )
}

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister() {
    setError('')
    if (!fullName.trim()) { setError('What should we call you? Add your name.'); return }
    if (!email.trim() || !email.includes('@')) { setError('Enter a valid email address.'); return }
    if (!password) { setError('Choose a password to continue.'); return }
    if (password.length < 8) { setError('Password needs to be at least 8 characters.'); return }

    const normalizedEmail = email.trim().toLowerCase()
    try {
      setLoading(true)
      const { error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { full_name: fullName.trim() } },
      })

      if (authError) {
        if (authError.code === 'user_already_exists') {
          setError('An account already exists with this email. Sign in or reset your password.')
          return
        } else {
          throw authError
        }
      }

      router.push({ pathname: '/(auth)/otp', params: { email: normalizedEmail } })
    } catch (err: unknown) {
      logger.error('auth', 'register', err)
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleRegister() {
    setError('')
    try {
      setLoading(true)
      const session = await signInWithGoogle()
      if (!session) return
      router.replace(isNewOAuthUser(session.user.created_at) ? '/(auth)/role-select' : '/')
    } catch (err: unknown) {
      logger.error('auth', 'googleRegister', err)
      const raw = err instanceof Error ? err.message : ''
      setError(raw || 'Google sign-in failed. Please try again.')
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

        <Text style={{
          fontFamily: 'Syne_700Bold', fontSize: 28,
          letterSpacing: -0.56, color: colors.text, marginBottom: 32,
        }}>
          Create your account.
        </Text>

        <View style={{ gap: 16, marginBottom: 8 }}>
          <WInput
            label="Full name"
            value={fullName}
            onChangeText={(t) => { setFullName(t); setError('') }}
            autoCapitalize="words"
            autoComplete="name"
            placeholder="e.g. Chukwuemeka Obi"
          />
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

        <InlineError message={error} />

        <WButton
          label="Create account"
          variant="dark"
          onPress={handleRegister}
          loading={loading}
          style={{ marginBottom: 28, marginTop: 12 }}
        />

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        {/* Social auth */}
        <View style={{ gap: 12, marginBottom: 28 }}>
          <WButton
            label="Continue with Apple"
            variant="outline"
            onPress={() => {}}
            icon={<AppleSvg width={24} height={24} />}
          />
          <WButton
            label="Continue with Google"
            variant="outline"
            onPress={handleGoogleRegister}
            disabled={loading}
            icon={<GoogleSvg width={20} height={20} />}
          />
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>
            Already have an account?
          </Text>
          <Link href="/(auth)/login">
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text, textDecorationLine: 'underline' }}>
              Sign in
            </Text>
          </Link>
        </View>

        <Text style={{
          fontFamily: 'DMSans_400Regular', fontSize: 12,
          color: colors.textFaint, textAlign: 'center',
          marginTop: 20, lineHeight: 18,
        }}>
          By creating an account you agree to WorkIt's{' '}
          <Text style={{ textDecorationLine: 'underline' }}>Terms of Service</Text> and{' '}
          <Text style={{ textDecorationLine: 'underline' }}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
