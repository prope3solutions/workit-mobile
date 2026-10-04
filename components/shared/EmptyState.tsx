import { View, Text } from 'react-native'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'

interface EmptyStateProps {
  title: string
  subtitle?: string
  ctaLabel?: string
  onCta?: () => void
}

export function EmptyState({ title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 }}>
      <Text
        style={{
          fontFamily: 'Syne_700Bold',
          fontSize: 20,
          color: colors.white,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: colors.slate,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          {subtitle}
        </Text>
      )}
      {ctaLabel && onCta && (
        <WButton label={ctaLabel} onPress={onCta} style={{ minWidth: 180 }} />
      )}
    </View>
  )
}
