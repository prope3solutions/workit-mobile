import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { colors } from '@/lib/theme/colors'

const STEPS = ['Gym details', 'Equipment', 'Plans', 'Trainers', 'Payout', 'Review']

interface OnboardingShellProps {
  step: number // 1-indexed, matches steps
  title: string
  subtitle?: string
  children: React.ReactNode
  footer: React.ReactNode
  steps?: string[]
}

export function OnboardingShell({ step, title, subtitle, children, footer, steps = STEPS }: OnboardingShellProps) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ paddingTop: 64, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i < step ? colors.green : colors.border,
              }}
            />
          ))}
        </View>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
          Step {step} of {steps.length} — {steps[step - 1]}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, letterSpacing: -0.52, color: colors.text, marginBottom: 8 }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, marginBottom: 28, lineHeight: 22 }}>
            {subtitle}
          </Text>
        )}
        {children}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: 40,
          paddingTop: 16,
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {footer}
      </View>
    </KeyboardAvoidingView>
  )
}
