import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { User, House, Medal } from 'lucide-react-native'
import type { LucideIcon } from 'lucide-react-native'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { UserRole } from '@/types/database'

const ROLES: { role: UserRole; label: string; description: string; icon: LucideIcon }[] = [
  {
    role: 'member',
    label: "I'm looking for a gym",
    description: 'Find and join gyms near you.',
    icon: User,
  },
  {
    role: 'gym_admin',
    label: 'I manage a gym',
    description: 'List your gym and manage members.',
    icon: House,
  },
  {
    role: 'trainer',
    label: "I'm a trainer",
    description: 'Offer personal training on WorkIt.',
    icon: Medal,
  },
]

export default function RoleSelectScreen() {
  const [selected, setSelected] = useState<UserRole | null>(null)

  function handleContinue() {
    if (!selected) return
    if (selected === 'gym_admin') {
      router.push('/(gym-onboarding)/gym-details')
    } else if (selected === 'trainer') {
      router.push('/(trainer-onboarding)/basic-info')
    } else {
      router.push('/(auth)/profile-setup')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: 48 }} />

        {/* Heading */}
        <Text
          style={{
            fontFamily: 'Syne_700Bold',
            fontSize: 28,
            letterSpacing: -0.56,
            lineHeight: 33.6,
            color: colors.text,
            marginBottom: 8,
          }}
        >
          How are you using WorkIt?
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: colors.textMuted,
            marginBottom: 36,
          }}
        >
          Pick one — you can switch later.
        </Text>

        {/* Role cards */}
        <View style={{ gap: 12 }}>
          {ROLES.map(({ role, label, description, icon: Icon }) => {
            const isSelected = selected === role
            return (
              <TouchableOpacity
                key={role}
                onPress={() => setSelected(role)}
                activeOpacity={0.85}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  paddingVertical: 18,
                  paddingHorizontal: 18,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: isSelected ? colors.text : colors.border,
                  backgroundColor: isSelected ? colors.stone2 : colors.surface,
                }}
              >
                {/* Icon badge — soft green tile with green line icon */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: `${colors.green}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={24} color={colors.greenDeep} strokeWidth={2} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text,
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 14,
                      color: colors.textMuted,
                    }}
                  >
                    {description}
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: 48,
          paddingTop: 16,
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <WButton
          label="Continue"
          variant="green"
          onPress={handleContinue}
          disabled={!selected}
        />
      </View>
    </View>
  )
}
