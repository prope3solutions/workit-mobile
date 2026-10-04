import { useEffect, useState } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'

export default function ClaimGymScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>()

  const [checking, setChecking] = useState(true)
  const [gymName, setGymName] = useState('')
  const [gymCity, setGymCity] = useState('')
  const [invalidReason, setInvalidReason] = useState('')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setInvalidReason('This claim link is missing its code.')
      setChecking(false)
      return
    }
    supabase.functions
      .invoke('claim-gym', { body: { action: 'lookup', claimToken: token } })
      .then(({ data, error }) => {
        if (error || data?.error) {
          setInvalidReason(data?.error ?? 'This claim link is invalid or already used.')
        } else {
          setGymName(data.gymName)
          setGymCity(data.gymCity)
        }
      })
      .finally(() => setChecking(false))
  }, [token])

  async function handleClaim() {
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      Alert.alert('Missing details', 'Enter your name, email, and a password of at least 8 characters.')
      return
    }
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('claim-gym', {
        body: {
          action: 'claim',
          claimToken: token,
          email: email.trim().toLowerCase(),
          password,
          fullName: fullName.trim(),
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      if (data.existingAccount) {
        Alert.alert(
          'Gym linked to your account',
          'This email already has a WorkIt account, so we linked the gym to it. Log in as usual to manage it.',
          [{ text: 'Go to login', onPress: () => router.replace('/(auth)/login') }]
        )
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (signInError) throw signInError
      router.replace('/')
    } catch (err: unknown) {
      logger.error('auth', 'claimGym', err)
      const message = err instanceof Error ? err.message : 'Could not claim this gym.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.text} />
      </View>
    )
  }

  if (invalidReason) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
          Link not valid
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, textAlign: 'center' }}>
          {invalidReason}
        </Text>
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
        <View style={{ paddingTop: 48 }} />

        <View
          style={{
            alignSelf: 'flex-start', backgroundColor: '#E6FFF2', borderRadius: 999,
            paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16,
          }}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.green }}>
            Gym profile ready
          </Text>
        </View>

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, letterSpacing: -0.52, lineHeight: 31.2, color: colors.text, marginBottom: 6 }}>
          Claim {gymName}.
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, marginBottom: 28 }}>
          {gymCity ? `${gymCity} · ` : ''}Set your password to take over this profile.
        </Text>

        <View style={{ gap: 16, marginBottom: 8 }}>
          <WInput label="Your full name" value={fullName} onChangeText={setFullName} placeholder="e.g. Chinedu Okafor" autoCapitalize="words" />
          <WInput label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" />
          <WInput label="Create a password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" hint="8+ characters." />
        </View>

        <WButton label="Claim this gym" variant="green" onPress={handleClaim} loading={loading} style={{ marginTop: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
