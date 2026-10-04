import { useState } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import { AlertCircle } from 'lucide-react-native'

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleUpdate() {
    setError('')
    if (!password) { setError('Enter a new password.'); return }
    if (password.length < 8) { setError('Password needs to be at least 8 characters.'); return }
    if (password !== confirm) { setError("Passwords don't match."); return }

    try {
      setLoading(true)
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setDone(true)
    } catch (err: unknown) {
      logger.error('auth', 'resetPassword', err)
      setError('Could not update your password. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 48, justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 28, letterSpacing: -0.56, color: colors.text, marginBottom: 16 }}>
            Password updated.
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, lineHeight: 22 }}>
            You're all set. Sign in with your new password.
          </Text>
        </View>
        <WButton
          label="Go to sign in"
          variant="dark"
          onPress={() => router.replace('/(auth)/login')}
        />
      </View>
    )
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
        <View style={{ paddingTop: 64, marginBottom: 40 }}>
          <Text style={{
            fontFamily: 'Syne_700Bold', fontSize: 28,
            letterSpacing: -0.56, color: colors.text, marginBottom: 8,
          }}>
            Set a new{'\n'}password.
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, lineHeight: 22 }}>
            Make it something you'll remember.
          </Text>
        </View>

        <View style={{ gap: 16, marginBottom: error ? 12 : 32 }}>
          <WInput
            label="New password"
            value={password}
            onChangeText={(t) => { setPassword(t); setError('') }}
            secureTextEntry
            placeholder="Min. 8 characters"
          />
          <WInput
            label="Confirm password"
            value={confirm}
            onChangeText={(t) => { setConfirm(t); setError('') }}
            secureTextEntry
            placeholder="Repeat your new password"
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
          label="Update password"
          variant="dark"
          onPress={handleUpdate}
          loading={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
