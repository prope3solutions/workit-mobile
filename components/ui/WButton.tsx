import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  ViewStyle,
  TouchableOpacityProps,
} from 'react-native'
import { colors } from '@/lib/theme/colors'

interface WButtonProps extends TouchableOpacityProps {
  label: string
  loading?: boolean
  variant?: 'dark' | 'green' | 'outline' | 'ghost' | 'danger'
  icon?: React.ReactNode
}

const VARIANTS = {
  dark: {
    bg: colors.obsidian,
    text: colors.chalk,
    border: 'transparent',
  },
  green: {
    bg: colors.green,
    text: colors.onAccent,
    border: 'transparent',
  },
  outline: {
    bg: 'transparent',
    text: colors.text,
    border: colors.border,
  },
  ghost: {
    bg: 'transparent',
    text: colors.textMuted,
    border: 'transparent',
  },
  danger: {
    bg: colors.ember,
    text: colors.white,
    border: 'transparent',
  },
}

export function WButton({
  label,
  loading = false,
  variant = 'dark',
  disabled,
  style,
  icon,
  ...props
}: WButtonProps) {
  const v = VARIANTS[variant]
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        {
          backgroundColor: v.bg,
          borderRadius: 12,
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: v.border,
          opacity: isDisabled ? 0.45 : 1,
        },
        style as ViewStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon && <View>{icon}</View>}
          <Text
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 16,
              fontWeight: '600',
              letterSpacing: -0.08,
              color: v.text,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}
