import { View, Text } from 'react-native'
import { colors } from '@/lib/theme/colors'

type BadgeVariant = 'green' | 'amber' | 'ember' | 'slate'

interface WBadgeProps {
  label: string
  variant?: BadgeVariant
}

const VARIANT_MAP: Record<BadgeVariant, { bg: string; text: string }> = {
  green: { bg: '#001A0D', text: colors.green },
  amber: { bg: '#1A1200', text: colors.amber },
  ember: { bg: '#1A0000', text: colors.ember },
  slate: { bg: colors.deep, text: colors.slate },
}

export function WBadge({ label, variant = 'slate' }: WBadgeProps) {
  const v = VARIANT_MAP[variant]
  return (
    <View
      style={{
        backgroundColor: v.bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: v.text }}>
        {label}
      </Text>
    </View>
  )
}
