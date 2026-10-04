import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput, Linking } from 'react-native'
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router'
import { ArrowLeft, FileText } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { WCard } from '@/components/ui/WCard'
import { WBadge } from '@/components/ui/WBadge'
import { WButton } from '@/components/ui/WButton'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatDate } from '@/lib/utils/formatDate'
import type { TrainerStatus } from '@/types/database'

const SIGNED_URL_EXPIRY_SECONDS = 60 * 5

interface Certification {
  id: string
  name: string
  org: string
  year: number
  documentUrl: string
}

interface TrainerDetail {
  id: string
  userId: string
  displayName: string
  photoUrl: string | null
  phone: string
  email: string
  city: string
  yearsExperience: number | null
  status: TrainerStatus
  adminNote: string | null
  createdAt: string
  certifications: Certification[]
  governmentIdUrl: string | null
}

function initials(name: string) {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function statusLabel(status: TrainerStatus) {
  return status.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

const badgeVariant = (status: TrainerStatus) =>
  status === 'approved' ? 'green' : status === 'pending_review' || status === 'more_info_requested' ? 'amber' : status === 'rejected' ? 'ember' : 'slate'

export default function SuperAdminTrainerDetailScreen() {
  const colors = useColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [trainer, setTrainer] = useState<TrainerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [certUrls, setCertUrls] = useState<Record<string, string>>({})
  const [idUrl, setIdUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const { data: t, error } = await supabase
        .from('trainer_profiles')
        .select('id, user_id, display_name, photo_url, phone, email, city, years_experience, status, admin_note, created_at')
        .eq('id', id)
        .single()
      if (error) throw error

      const [certsRes, identityRes] = await Promise.all([
        supabase
          .from('trainer_certifications')
          .select('id, certification_name, issuing_organization, year_issued, document_url')
          .eq('trainer_id', id),
        supabase
          .from('trainer_identity_verification')
          .select('government_id_url')
          .eq('trainer_id', id)
          .maybeSingle(),
      ])
      if (certsRes.error) throw certsRes.error
      if (identityRes.error) throw identityRes.error

      const detail: TrainerDetail = {
        id: t.id,
        userId: t.user_id,
        displayName: t.display_name,
        photoUrl: t.photo_url,
        phone: t.phone || '—',
        email: t.email || '—',
        city: t.city || '—',
        yearsExperience: t.years_experience,
        status: t.status as TrainerStatus,
        adminNote: t.admin_note,
        createdAt: t.created_at ?? new Date(0).toISOString(),
        certifications: (certsRes.data ?? []).map((c) => ({
          id: c.id,
          name: c.certification_name,
          org: c.issuing_organization,
          year: c.year_issued,
          documentUrl: c.document_url,
        })),
        governmentIdUrl: identityRes.data?.government_id_url ?? null,
      }
      setTrainer(detail)
      setNoteInput(detail.adminNote || '')
    } catch (err) {
      logger.error('superAdmin', 'fetchTrainerDetail', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function openSignedDocument(path: string, cacheKey: string, setter: (url: string) => void, cached?: string) {
    if (cached) {
      Linking.openURL(cached)
      return
    }
    try {
      const { data, error } = await supabase.storage
        .from('trainer-documents')
        .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS)
      if (error) throw error
      if (data?.signedUrl) {
        setter(data.signedUrl)
        Linking.openURL(data.signedUrl)
      }
    } catch (err) {
      logger.error('superAdmin', 'createSignedDocumentUrl', err)
      Alert.alert('Error', 'Failed to open document.')
    }
  }

  async function handleApprove() {
    if (!trainer) return
    setBusy(true)
    try {
      const { error } = await supabase.from('trainer_profiles').update({ status: 'approved' }).eq('id', trainer.id)
      if (error) throw error

      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: trainer.userId,
        title: 'Trainer Application Approved',
        body: `Congratulations ${trainer.displayName}, your trainer profile has been approved and is now live on WorkIt.`,
        type: 'trainer_approved',
      })
      if (notifError) logger.error('superAdmin', 'notifyTrainerApproved', notifError)

      Alert.alert('Approved', `${trainer.displayName} has been approved and is now live on WorkIt.`)
      router.back()
    } catch (err) {
      logger.error('superAdmin', 'approveTrainer', err)
      Alert.alert('Error', `Failed to approve ${trainer.displayName}.`)
    } finally {
      setBusy(false)
    }
  }

  async function handleReject() {
    if (!trainer) return
    if (!noteInput.trim()) {
      Alert.alert('Reason required', 'Please provide a reason for rejecting this trainer.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase
        .from('trainer_profiles')
        .update({ status: 'rejected', admin_note: noteInput.trim() })
        .eq('id', trainer.id)
      if (error) throw error
      Alert.alert('Rejected', `${trainer.displayName}'s application has been rejected.`)
      router.back()
    } catch (err) {
      logger.error('superAdmin', 'rejectTrainer', err)
      Alert.alert('Error', 'Failed to reject trainer.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRequestMoreInfo() {
    if (!trainer) return
    if (!noteInput.trim()) {
      Alert.alert('Message required', 'Please provide a message describing what more info is needed.')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase
        .from('trainer_profiles')
        .update({ status: 'more_info_requested', admin_note: noteInput.trim() })
        .eq('id', trainer.id)
      if (error) throw error
      Alert.alert('Sent', `${trainer.displayName} has been asked for more information.`)
      router.back()
    } catch (err) {
      logger.error('superAdmin', 'requestMoreInfoTrainer', err)
      Alert.alert('Error', 'Failed to request more info.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.obsidian, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} />
      </View>
    )
  }

  if (!trainer) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.obsidian, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', color: colors.slate, textAlign: 'center' }}>
          Trainer not found.
        </Text>
      </View>
    )
  }

  const isPendingReview = trainer.status === 'pending_review' || trainer.status === 'more_info_requested'

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.white }}>Trainer Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          {trainer.photoUrl ? (
            <Image
              source={{ uri: trainer.photoUrl }}
              style={{ width: 72, height: 72, borderRadius: 22, marginBottom: 12 }}
            />
          ) : (
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                backgroundColor: colors.deep,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.green }}>{initials(trainer.displayName)}</Text>
            </View>
          )}
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.white, textAlign: 'center' }}>{trainer.displayName}</Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate, marginTop: 4 }}>{trainer.city}</Text>
          <View style={{ marginTop: 10 }}>
            <WBadge label={statusLabel(trainer.status)} variant={badgeVariant(trainer.status)} />
          </View>
        </View>

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
          Trainer Info
        </Text>
        <WCard style={{ marginBottom: 20, gap: 12 }}>
          {[
            { label: 'Phone', value: trainer.phone },
            { label: 'Email', value: trainer.email },
            { label: 'Years Experience', value: trainer.yearsExperience != null ? `${trainer.yearsExperience} yrs` : '—' },
            { label: 'Submitted', value: formatDate(trainer.createdAt) },
          ].map((row) => (
            <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.slate }}>{row.label}</Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white }}>{row.value}</Text>
            </View>
          ))}
        </WCard>

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
          Certifications
        </Text>
        <WCard style={{ marginBottom: 20, gap: 4 }}>
          {trainer.certifications.length === 0 ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate }}>No certifications submitted.</Text>
          ) : (
            trainer.certifications.map((cert, index) => (
              <TouchableOpacity
                key={cert.id}
                onPress={() => openSignedDocument(cert.documentUrl, cert.id, (url) => setCertUrls((prev) => ({ ...prev, [cert.id]: url })), certUrls[cert.id])}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: colors.adminBorder,
                }}
              >
                <FileText size={18} color={colors.green} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white }}>{cert.name}</Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate, marginTop: 2 }}>
                    {cert.org} · {cert.year}
                  </Text>
                </View>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.green }}>View</Text>
              </TouchableOpacity>
            ))
          )}
        </WCard>

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
          Identity Verification
        </Text>
        <WCard style={{ marginBottom: 20 }}>
          {trainer.governmentIdUrl ? (
            <TouchableOpacity
              onPress={() => openSignedDocument(trainer.governmentIdUrl!, 'gov-id', setIdUrl, idUrl || undefined)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <FileText size={18} color={colors.green} strokeWidth={2} />
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white, flex: 1 }}>Government ID</Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.green }}>View</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate }}>No identity document submitted.</Text>
          )}
        </WCard>

        {isPendingReview && (
          <>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
              Admin Note
            </Text>
            <TextInput
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder="Reason for rejection or info needed..."
              placeholderTextColor={colors.slate}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: colors.deep,
                borderRadius: 12,
                padding: 14,
                fontFamily: 'DMSans_400Regular',
                fontSize: 14,
                color: colors.white,
                marginBottom: 20,
                minHeight: 90,
                textAlignVertical: 'top',
              }}
            />

            <View style={{ gap: 12 }}>
              <WButton label="Approve" variant="green" onPress={handleApprove} loading={busy} />
              <WButton label="Request More Info" variant="outline" onPress={handleRequestMoreInfo} loading={busy} />
              <WButton label="Reject" variant="danger" onPress={handleReject} loading={busy} />
            </View>
          </>
        )}

        {!isPendingReview && trainer.adminNote && (
          <>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
              Admin Note
            </Text>
            <WCard style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate, lineHeight: 19 }}>
                {trainer.adminNote}
              </Text>
            </WCard>
          </>
        )}
      </ScrollView>
    </View>
  )
}
