import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export type TrainerAssetKind = 'photo' | 'cover' | 'certification' | 'gov-id' | 'selfie' | 'proof-of-address'

interface UploadTrainerAssetOptions {
  certificationId?: string
}

interface UploadTrainerAssetResult {
  path: string
  bucket: string
}

const IMAGE_KINDS: TrainerAssetKind[] = ['photo', 'cover', 'selfie']

function extFromUri(uri: string, fallback: string) {
  const match = uri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/)
  return match ? match[1].toLowerCase() : fallback
}

function bucketForKind(kind: TrainerAssetKind) {
  return kind === 'photo' || kind === 'cover' ? 'trainer-photos' : 'trainer-documents'
}

function pathForKind(kind: TrainerAssetKind, uid: string, ext: string, options?: UploadTrainerAssetOptions) {
  switch (kind) {
    case 'photo':
      return `${uid}/photo.${ext}`
    case 'cover':
      return `${uid}/cover.${ext}`
    case 'certification':
      return `${uid}/certifications/${options?.certificationId ?? Date.now()}.${ext}`
    case 'gov-id':
      return `${uid}/identity/gov-id.${ext}`
    case 'selfie':
      return `${uid}/identity/selfie.${ext}`
    case 'proof-of-address':
      return `${uid}/identity/proof-of-address.${ext}`
  }
}

export async function uploadTrainerAsset(
  kind: TrainerAssetKind,
  options?: UploadTrainerAssetOptions
): Promise<UploadTrainerAssetResult | null> {
  try {
    let uri: string
    let mimeType: string
    let ext: string

    if (IMAGE_KINDS.includes(kind)) {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      })
      if (result.canceled || !result.assets?.[0]) return null
      uri = result.assets[0].uri
      mimeType = result.assets[0].mimeType ?? 'image/jpeg'
      ext = extFromUri(uri, 'jpg')
    } else {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      })
      if (result.canceled || !result.assets?.[0]) return null
      uri = result.assets[0].uri
      mimeType = result.assets[0].mimeType ?? 'application/octet-stream'
      ext = extFromUri(uri, mimeType.includes('pdf') ? 'pdf' : 'jpg')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No session found')

    const bucket = bucketForKind(kind)
    const path = pathForKind(kind, user.id, ext, options)

    const response = await fetch(uri)
    const blob = await response.blob()

    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      contentType: mimeType,
      upsert: true,
    })
    if (error) throw error

    return { path, bucket }
  } catch (err: unknown) {
    logger.error('trainerOnboarding', 'uploadAsset', err)
    return null
  }
}
