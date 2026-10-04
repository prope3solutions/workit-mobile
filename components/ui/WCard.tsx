import { View, ViewProps } from 'react-native'
import { colors } from '@/lib/theme/colors'

interface WCardProps extends ViewProps {
  padding?: number
}

export function WCard({ style, padding = 16, children, ...props }: WCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.deep,
          borderRadius: 16,
          padding,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
}
