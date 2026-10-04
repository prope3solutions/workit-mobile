import { memo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Star, ShieldCheck } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { formatCurrency } from '@/lib/utils/formatCurrency'

const WORKIT_DEFAULT = require('../../assets/workit.png')

interface GymCardProps {
  id: string
  name: string
  coverImageUrl: string | null
  logoUrl: string | null
  rating: number
  reviewCount: number
  distanceLabel?: string
  startingPriceNaira?: number | null
  description?: string | null
  tags: string[]
  isVerified: boolean
  onPress: () => void
}

export const GymCard = memo(function GymCard({
  name,
  coverImageUrl,
  logoUrl,
  rating,
  reviewCount,
  distanceLabel,
  startingPriceNaira,
  description,
  tags,
  isVerified,
  onPress,
}: GymCardProps) {
  const c = useColors()
  const [coverFailed, setCoverFailed] = useState(false)

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: c.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.border,
        overflow: 'hidden',
      }}
    >
      <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: c.stone2 }}>
        {coverImageUrl && !coverFailed ? (
          <Image
            source={{ uri: coverImageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <Image source={WORKIT_DEFAULT} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        )}

        {isVerified && (
          <View style={{
            position: 'absolute', top: 10, left: 10,
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999,
            paddingHorizontal: 10, paddingVertical: 4,
          }}>
            <ShieldCheck size={12} color={c.greenDeep} strokeWidth={2.5} />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: c.obsidian }}>Verified</Text>
          </View>
        )}

        <View style={{
          position: 'absolute', top: 10, right: 10,
          flexDirection: 'row', alignItems: 'center', gap: 3,
          backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 999,
          paddingHorizontal: 8, paddingVertical: 4,
        }}>
          <Star size={12} color={c.amber} fill={c.amber} strokeWidth={0} />
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: c.obsidian }}>{rating.toFixed(1)}</Text>
        </View>

        {logoUrl && (
          <View style={{
            position: 'absolute', bottom: 10, left: 10,
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: c.white, overflow: 'hidden',
            borderWidth: 2, borderColor: c.white,
          }}>
            <Image source={{ uri: logoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          </View>
        )}
      </View>

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={{ fontFamily: 'Syne_700Bold', fontSize: 18, letterSpacing: -0.3, color: c.text, marginBottom: 4 }}
              numberOfLines={1}
            >
              {name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Star size={11} color={c.textMuted} strokeWidth={2} />
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: c.textMuted }}>
                {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                {distanceLabel ? ` · ${distanceLabel}` : ''}
              </Text>
            </View>
          </View>
          {startingPriceNaira != null && (
            <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
                from
              </Text>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: c.greenDeep, letterSpacing: -0.3 }}>
                {formatCurrency(startingPriceNaira)}
              </Text>
            </View>
          )}
        </View>

        {description && (
          <Text
            style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: c.textMuted, marginTop: 8, lineHeight: 18 }}
            numberOfLines={2}
          >
            {description}
          </Text>
        )}

        {tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'nowrap', gap: 6, marginTop: 12, overflow: 'hidden' }}>
            {tags.slice(0, 3).map((tag) => (
              <View key={tag} style={{ backgroundColor: c.stone2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: c.textMuted }}>{tag}</Text>
              </View>
            ))}
            {tags.length > 3 && (
              <View style={{ backgroundColor: c.stone2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: c.textMuted }}>+{tags.length - 3}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  )
})
