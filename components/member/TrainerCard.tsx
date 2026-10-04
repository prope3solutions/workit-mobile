import { View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Star, ShieldCheck } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { formatCurrency } from '@/lib/utils/formatCurrency'

interface TrainerCardProps {
  id: string
  displayName: string
  photoUrl: string | null
  rating: number
  reviewCount: number
  yearsExperience: number | null
  primarySpecialization: string | null
  startingPriceNaira: number | null
  gymNames: string[]
  isIndependent: boolean
  compact?: boolean
  variant?: 'coach' | 'trainer'
  onPress: () => void
}

function initials(name: string) {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export function TrainerCard({
  displayName,
  photoUrl,
  rating,
  reviewCount,
  yearsExperience,
  primarySpecialization,
  startingPriceNaira,
  gymNames,
  isIndependent,
  compact = false,
  variant = 'trainer',
  onPress,
}: TrainerCardProps) {
  const c = useColors()
  const isCoach = variant === 'coach'
  const avatarSize = compact ? 44 : 56

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: c.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.border,
        padding: compact ? 10 : 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: compact ? 10 : 12,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{
        width: avatarSize, height: avatarSize, borderRadius: compact ? 12 : 16,
        backgroundColor: c.stone2,
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
        ) : (
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: compact ? 14 : 17, color: c.textMuted }}>
            {initials(displayName)}
          </Text>
        )}
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: compact ? 14 : 15, color: c.text }}>
            {displayName}
          </Text>
          {!isCoach && <ShieldCheck size={13} color={c.green} strokeWidth={2.5} />}
        </View>

        {isCoach ? (
          primarySpecialization && (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: c.textMuted }}>
              {primarySpecialization}
            </Text>
          )
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <Star size={11} color={c.amber} fill={c.amber} strokeWidth={0} />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: c.text }}>
              {rating.toFixed(1)}
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: c.textMuted }}>
              ({reviewCount})
              {yearsExperience != null ? ` · ${yearsExperience}y exp` : ''}
              {' · '}{isIndependent ? 'Independent' : (gymNames[0] ?? 'Nigeria')}
            </Text>
          </View>
        )}

        {!isCoach && primarySpecialization && !compact && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            <View style={{ backgroundColor: c.stone2, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: c.textMuted }}>{primarySpecialization}</Text>
            </View>
          </View>
        )}
      </View>

      {!isCoach && startingPriceNaira != null && (
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            from
          </Text>
          <Text style={{ fontFamily: 'Inter_700Bold', fontSize: compact ? 13 : 14, color: c.greenDeep }}>
            {formatCurrency(startingPriceNaira)}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
