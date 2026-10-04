import { useState } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert, Pressable, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { Camera } from 'lucide-react-native'
import { supabase } from '@/lib/supabase'
import { decodeBase64 } from '@/lib/utils/base64'
import { logger } from '@/lib/logger'
import type { UserRole } from '@/types/database'
import { colors } from '@/lib/theme/colors'
import { useAuthStore } from '@/lib/stores/authStore'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'

export default function ProfileSetupScreen() {
  const setUser = useAuthStore((s) => s.setUser)
  const [nickname, setNickname] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function pickPhoto() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { Alert.alert('Error', 'No session found.'); return }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add a profile picture.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    })
    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    const ext = (asset.uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/)?.[1] ?? 'jpg').toLowerCase()
    const mimeType = asset.mimeType ?? 'image/jpeg'
    const path = `${user.id}/avatar.${ext}`

    try {
      setUploading(true)
      if (!asset.base64) throw new Error('Could not read the selected image.')
      const bytes = decodeBase64(asset.base64)

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, { contentType: mimeType, upsert: true })
      if (uploadError) throw uploadError

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(`${pub.publicUrl}?t=${Date.now()}`)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err) {
      logger.error('auth', 'profileSetupAvatar', err)
      Alert.alert('Upload failed', 'Could not upload your photo. You can add one later.')
    } finally {
      setUploading(false)
    }
  }

  async function persist(toSave: { nickname?: string | null; avatar_url?: string | null }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No session found')
    const { data, error } = await supabase
      .from('users')
      .update(toSave)
      .eq('id', user.id)
      .select('id, email, full_name, nickname, phone, role, avatar_url')
      .single()
    if (error) throw error
    setUser({ ...data, role: data.role as UserRole })
  }

  async function handleContinue() {
    try {
      setSaving(true)
      const updates: { nickname?: string | null; avatar_url?: string | null } = {}
      if (nickname.trim()) updates.nickname = nickname.trim()
      if (avatarUrl) updates.avatar_url = avatarUrl
      if (Object.keys(updates).length > 0) {
        await persist(updates)
      }
      router.replace('/(member)/discover')
    } catch (err: unknown) {
      logger.error('auth', 'profileSetup', err)
      const message = err instanceof Error ? err.message : 'Could not save. Try again.'
      Alert.alert('Error', message)
    } finally {
      setSaving(false)
    }
  }

  function handleSkip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.replace('/(member)/discover')
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
          fontFamily: 'Syne_700Bold', fontSize: 28, letterSpacing: -0.56,
          lineHeight: 33.6, color: colors.text, marginBottom: 8,
        }}>
          Make it yours.
        </Text>
        <Text style={{
          fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted,
          marginBottom: 36, lineHeight: 22,
        }}>
          Add a nickname and photo — totally optional. You can always change these later.
        </Text>

        {/* Avatar picker */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Pressable onPress={pickPhoto} disabled={uploading}>
            <View style={{
              width: 104, height: 104, borderRadius: 52,
              backgroundColor: colors.stone2,
              borderWidth: 1, borderColor: colors.border,
              alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {uploading ? (
                <ActivityIndicator color={colors.green} />
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: 104, height: 104 }} contentFit="cover" />
              ) : (
                <Camera size={30} color={colors.textMuted} strokeWidth={1.75} />
              )}
            </View>
            {/* Small badge */}
            <View style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 34, height: 34, borderRadius: 17,
              backgroundColor: colors.green,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 3, borderColor: colors.bg,
            }}>
              <Camera size={15} color={colors.obsidian} strokeWidth={2.2} />
            </View>
          </Pressable>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 12 }}>
            {avatarUrl ? 'Tap to change' : 'Add a profile photo'}
          </Text>
        </View>

        {/* Nickname */}
        <View style={{ marginBottom: 40 }}>
          <WInput
            label="Nickname"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
            placeholder="What should we call you?"
            maxLength={24}
          />
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textFaint, marginTop: 8 }}>
            This is how we'll greet you on your home screen.
          </Text>
        </View>

        <View style={{ gap: 12 }}>
          <WButton
            label="Continue to WorkIt"
            variant="green"
            onPress={handleContinue}
            loading={saving}
          />
          <WButton
            label="Skip for now"
            variant="ghost"
            onPress={handleSkip}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
