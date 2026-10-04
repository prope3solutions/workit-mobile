import { useState } from 'react'
import { View, Text, TouchableOpacity, Alert } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useTrainerOnboardingId } from '@/lib/hooks/useTrainerOnboardingId'
import { uploadTrainerAsset } from '@/lib/upload/uploadTrainerAsset'

const STEPS = ['Basic info', 'Professional info', 'Certifications', 'Bio', 'Pricing', 'Availability', 'Service type', 'Preferred gyms', 'Identity']

interface CertDraft {
  key: string
  certificationName: string
  issuingOrganization: string
  yearIssued: string
  documentPath: string | null
}

function newDraft(): CertDraft {
  return { key: `${Date.now()}-${Math.random()}`, certificationName: '', issuingOrganization: '', yearIssued: '', documentPath: null }
}

export default function CertificationsScreen() {
  const { trainerId } = useTrainerOnboardingId()
  const [drafts, setDrafts] = useState<CertDraft[]>([newDraft()])
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function updateDraft(key: string, patch: Partial<CertDraft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  function addDraft() {
    setDrafts((prev) => [...prev, newDraft()])
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key))
  }

  async function handleUploadDoc(key: string) {
    try {
      setUploadingKey(key)
      const result = await uploadTrainerAsset('certification', { certificationId: key })
      if (result) updateDraft(key, { documentPath: result.path })
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'uploadCertification', err)
      Alert.alert('Error', 'Could not upload document.')
    } finally {
      setUploadingKey(null)
    }
  }

  async function handleNext() {
    if (!trainerId) {
      Alert.alert('Error', 'Missing trainer profile. Please restart onboarding.')
      return
    }
    const valid = drafts.filter((d) => d.certificationName.trim() && d.issuingOrganization.trim() && d.yearIssued.trim() && d.documentPath)
    try {
      setLoading(true)
      if (valid.length > 0) {
        const rows = valid.map((d) => ({
          trainer_id: trainerId,
          certification_name: d.certificationName.trim(),
          issuing_organization: d.issuingOrganization.trim(),
          year_issued: Number(d.yearIssued.trim()),
          document_url: d.documentPath as string,
        }))
        const { error } = await supabase.from('trainer_certifications').insert(rows)
        if (error) throw error
      }

      const { error: profileError } = await supabase
        .from('trainer_profiles')
        .update({ setup_certifications: true })
        .eq('id', trainerId)
      if (profileError) throw profileError

      router.push('/(trainer-onboarding)/bio')
    } catch (err: unknown) {
      logger.error('trainerOnboarding', 'certifications', err)
      const message = err instanceof Error ? err.message : 'Could not save certifications.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={3}
      steps={STEPS}
      title="Certifications."
      subtitle="Add any certifications that build trust with members. You can skip this if you have none yet."
      footer={<WButton label="Continue" variant="green" onPress={handleNext} loading={loading} />}
    >
      <View style={{ gap: 20 }}>
        {drafts.map((draft, i) => (
          <View
            key={draft.key}
            style={{
              gap: 12,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted }}>
                Certification {i + 1}
              </Text>
              {drafts.length > 1 && (
                <TouchableOpacity onPress={() => removeDraft(draft.key)}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.ember }}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
            <WInput
              label="Certification name"
              value={draft.certificationName}
              onChangeText={(v) => updateDraft(draft.key, { certificationName: v })}
              placeholder="e.g. Certified Personal Trainer"
            />
            <WInput
              label="Issuing organization"
              value={draft.issuingOrganization}
              onChangeText={(v) => updateDraft(draft.key, { issuingOrganization: v })}
              placeholder="e.g. NASM"
            />
            <WInput
              label="Year issued"
              value={draft.yearIssued}
              onChangeText={(v) => updateDraft(draft.key, { yearIssued: v })}
              placeholder="e.g. 2021"
              keyboardType="number-pad"
            />
            <TouchableOpacity
              onPress={() => handleUploadDoc(draft.key)}
              activeOpacity={0.8}
              style={{
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1.5,
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.text }}>
                {uploadingKey === draft.key ? 'Uploading...' : draft.documentPath ? 'Document uploaded' : 'Upload document'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addDraft} activeOpacity={0.8}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.green }}>
            + Add another certification
          </Text>
        </TouchableOpacity>
      </View>
    </OnboardingShell>
  )
}
