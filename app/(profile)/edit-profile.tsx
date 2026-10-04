import React, { useState } from 'react'
import {
  View, Text, ScrollView, Pressable,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { ArrowLeft, Camera } from 'lucide-react-native'
import { useAuth } from '@/lib/hooks/useAuth'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { decodeBase64 } from '@/lib/utils/base64'
import { logger } from '@/lib/logger'
import { useColors } from '@/lib/theme/colors'
import { WInput } from '@/components/ui/WInput'
import { WButton } from '@/components/ui/WButton'
import { Image } from 'expo-image'
import type { UserRole } from '@/types/database'

export default function EditProfileScreen() {
  const colors = useColors()
  const { user } = useAuth()
  const setUser = useAuthStore(s => s.setUser)

  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url ?? null)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const initials = fullName.trim()
    ? fullName.trim().split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : (user?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?')

  async function handleAvatarPress() {
    if (!user || uploadingAvatar) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    // Ask for library permission (no-op on web, prompts on native)
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to change your profile picture.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true, // needed for a reliable upload on React Native
    })
    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    const ext = (asset.uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/)?.[1] ?? 'jpg').toLowerCase()
    const mimeType = asset.mimeType ?? 'image/jpeg'
    const path = `${user.id}/avatar.${ext}`

    try {
      setUploadingAvatar(true)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // RN's fetch(uri).blob() uploads a broken/empty file to Supabase storage,
      // so decode the picker's base64 to bytes and upload that instead.
      if (!asset.base64) throw new Error('Could not read the selected image.')
      const bytes = decodeBase64(asset.base64)

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, { contentType: mimeType, upsert: true })
      if (uploadError) throw uploadError

      // Cache-bust so the new image shows immediately (same path is overwritten)
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = `${pub.publicUrl}?t=${Date.now()}`

      const { data, error: dbError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select()
        .single()
      if (dbError) throw dbError

      setAvatarUrl(publicUrl)
      setUser({ ...data, role: data.role as UserRole })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err) {
      logger.error('profile', 'uploadAvatar', err)
      Alert.alert('Upload failed', 'Could not update your photo. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSave() {
    if (!user) return
    const name = fullName.trim()
    if (!name) {
      Alert.alert('Name required', 'Please enter your full name.')
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      setSaving(true)
      const { data, error } = await supabase
        .from('users')
        .update({ full_name: name, phone: phone.trim() || null })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error
      setUser({ ...data, role: data.role as UserRole })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.back()
    } catch (err) {
      logger.error('profile', 'editProfile', err)
      Alert.alert('Error', 'Could not save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={{
        paddingTop: 60, paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back() }}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: colors.stone2,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ArrowLeft size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, letterSpacing: -0.4, color: colors.text, flex: 1 }}>
          Edit profile
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <Pressable onPress={handleAvatarPress} disabled={uploadingAvatar} style={{ position: 'relative' }}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 88, height: 88, borderRadius: 26 }}
                contentFit="cover"
              />
            ) : (
              <View style={{
                width: 88, height: 88, borderRadius: 26,
                backgroundColor: colors.obsidian,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 28, color: colors.green }}>
                  {initials}
                </Text>
              </View>
            )}

            {/* Uploading overlay */}
            {uploadingAvatar && (
              <View style={{
                position: 'absolute', top: 0, left: 0, width: 88, height: 88, borderRadius: 26,
                backgroundColor: 'rgba(0,0,0,0.45)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <ActivityIndicator color={colors.green} />
              </View>
            )}

            {/* Camera badge */}
            <View style={{
              position: 'absolute', bottom: -6, right: -6,
              width: 28, height: 28, borderRadius: 9,
              backgroundColor: colors.green,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 2, borderColor: colors.bg,
            }}>
              <Camera size={13} color={colors.obsidian} strokeWidth={2.2} />
            </View>
          </Pressable>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 16 }}>
            {uploadingAvatar ? 'Uploading…' : 'Tap to change photo'}
          </Text>
        </View>

        {/* Fields */}
        <View style={{ marginBottom: 24 }}>
          <WInput
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            placeholder="Your full name"
          />
        </View>

        <View style={{ marginBottom: 32 }}>
          <WInput
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="+234 800 000 0000"
          />
        </View>

        {/* Email — display only */}
        <View style={{
          backgroundColor: colors.stone2,
          borderRadius: 14, padding: 16,
          marginBottom: 32,
        }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint, marginBottom: 4, letterSpacing: 0.3 }}>
            Email (cannot be changed)
          </Text>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.textMuted }}>
            {user?.email ?? '—'}
          </Text>
        </View>

        <WButton
          label="Save changes"
          variant="dark"
          loading={saving}
          onPress={handleSave}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
