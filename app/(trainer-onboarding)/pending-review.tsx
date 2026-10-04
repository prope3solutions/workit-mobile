import { View, Text } from 'react-native'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { useAuth } from '@/lib/hooks/useAuth'

export default function PendingReviewScreen() {
  const { signOut } = useAuth()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
      <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, letterSpacing: -0.52, color: colors.text, marginBottom: 12, textAlign: 'center' }}>
        Your application is under review.
      </Text>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
        Our team is reviewing your trainer profile and documents. We'll notify you as soon as you're approved to start training on WorkIt.
      </Text>
      <WButton label="Sign out" variant="outline" onPress={signOut} />
    </View>
  )
}
