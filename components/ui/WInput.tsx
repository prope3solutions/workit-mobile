import { View, Text, TextInput, TextInputProps, TouchableOpacity } from 'react-native'
import { useState } from 'react'
import { colors } from '@/lib/theme/colors'

interface WInputProps extends TextInputProps {
  label?: string
  error?: string
  hint?: string
  suffix?: React.ReactNode
}

export function WInput({ label, error, hint, style, suffix, secureTextEntry, multiline, ...props }: WInputProps) {
  const [hidden, setHidden] = useState(secureTextEntry ?? false)

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 12,
            fontWeight: '500',
            letterSpacing: 0.12,
            color: colors.textMuted,
          }}
        >
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          backgroundColor: colors.surface,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: error ? colors.ember : colors.border,
          minHeight: multiline ? 88 : 52,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 14 : 0,
        }}
      >
        <TextInput
          placeholderTextColor={colors.textFaint}
          secureTextEntry={hidden}
          autoCorrect={false}
          multiline={multiline}
          style={[
            {
              flex: 1,
              fontFamily: 'DMSans_400Regular',
              fontSize: 16,
              color: colors.text,
              height: multiline ? undefined : '100%',
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>
              {hidden ? 'Show' : 'Hide'}
            </Text>
          </TouchableOpacity>
        )}
        {suffix && !secureTextEntry && suffix}
      </View>
      {hint && !error && (
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textFaint }}>
          {hint}
        </Text>
      )}
      {error && (
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.ember }}>
          {error}
        </Text>
      )}
    </View>
  )
}
