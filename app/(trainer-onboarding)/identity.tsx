import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useTrainerOnboardingId } from '@/lib/hooks/useTrainerOnboardingId'
import { uploadTrainerAsset } from '@/lib/upload/uploadTrainerAsset'

const STEPS = ['Basic info', 'Professional info', 'Certifications', 'Bio', 'Pricing', 'Availability', 'Service type', 'Preferred gyms', 'Identity']

export default function IdentityScreen() {
  const { trainerId } = useTrainerOnboardingId()
  const [govIdPath, setGovIdPath] = useState<string | null>(null)
  const [selfiePath, setSelfiePath] = useState<string | null>(null)
  const [proofPath, setProofPath] = useState<string | null>(null)
  const [uploadingKind, setUploadingKind] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleUpload(kind: 'gov-id' | 'selfie' | 'proof-of-address') {
    try {
      setUploadingKind(kind)
      const result = await uploadTrainerAsset(kind)
      if (!result) return
      if (kind === 'gov-id') setGovIdPath(result.path)
      else if (kind === 'selfie') setSelfiePath(result.path)
      else setProofPath(result.path)
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'uploadIdentity', err)
      Alert.alert('Error', 'Could not upload document.')
    } finally {
      setUploadingKind(null)
    }
  }

  async function handleSubmit() {
    if (!trainerId) {
      Alert.alert('Error', 'Missing trainer profile. Please restart onboarding.')
      return
    }
    if (!govIdPath || !selfiePath) {
      Alert.alert('Missing documents', 'Government ID and selfie are required.')
      return
    }
    try {
      setLoading(true)
      const { error } = await supabase.from('trainer_identity_verification').insert({
        trainer_id: trainerId,
        government_id_url: govIdPath,
        selfie_url: selfiePath,
        proof_of_address_url: proofPath,
      })
      if (error) throw error

      const { error: profileError } = await supabase
        .from('trainer_profiles')
        .update({ setup_identity: true, setup_submitted: true })
        .eq('id', trainerId)
      if (profileError) throw profileError

      router.replace('/(trainer)')
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'identity', err)
      const message = err instanceof Error ? err.message : 'Could not submit your application.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  const rows: { kind: 'gov-id' | 'selfie' | 'proof-of-address'; label: string; path: string | null; required: boolean }[] = [
    { kind: 'gov-id', label: 'Government ID', path: govIdPath, required: true },
    { kind: 'selfie', label: 'Selfie', path: selfiePath, required: true },
    { kind: 'proof-of-address', label: 'Proof of address (optional)', path: proofPath, required: false },
  ]

  return (
    <OnboardingShell
      step={9}
      steps={STEPS}
      title="Verify your identity."
      subtitle="Required before we can approve your trainer profile."
      footer={
        <WButton
          label="Submit for review"
          variant="green"
          onPress={handleSubmit}
          loading={loading}
          disabled={!govIdPath || !selfiePath}
        />
      }
    >
      <View style={{ gap: 16 }}>
        {rows.map(({ kind, label, path }) => (
          <View key={kind} style={{ gap: 8 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted }}>{label}</Text>
            <TouchableOpacity
              onPress={() => handleUpload(kind)}
              activeOpacity={0.8}
              style={{
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>
                {uploadingKind === kind ? 'Uploading...' : path ? 'Uploaded' : 'Upload'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </OnboardingShell>
  )
}
