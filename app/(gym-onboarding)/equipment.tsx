import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useGymOnboardingId } from '@/lib/hooks/useGymOnboardingId'

interface EquipmentItem {
  id: string
  name: string
  category: string
}

const CATEGORY_LABELS: Record<string, string> = {
  cardio: 'Cardio',
  strength: 'Strength',
  combat: 'Combat',
  aquatic: 'Aquatic',
  flexibility: 'Flexibility',
  group: 'Group',
  recovery: 'Recovery',
}

export default function EquipmentScreen() {
  const { gymId } = useGymOnboardingId()
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase
      .from('equipment')
      .select('id, name, category')
      .is('gym_id', null)
      .order('display_order')
      .then(({ data, error }) => {
        if (error) logger.error('gymOnboarding', 'fetchEquipment', error)
        setItems(data ?? [])
        setFetching(false)
      })
  }, [])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleNext() {
    if (!gymId) {
      Alert.alert('Error', 'Missing gym. Please restart onboarding.')
      return
    }
    try {
      setLoading(true)
      if (selected.size > 0) {
        const rows = Array.from(selected).map((equipment_id) => ({ gym_id: gymId, equipment_id }))
        const { error } = await supabase.from('gym_equipment').insert(rows)
        if (error) throw error
      }
      const { error: gymError } = await supabase
        .from('gyms')
        .update({ setup_equipment: true })
        .eq('id', gymId)
      if (gymError) throw gymError

      router.push('/(gym-onboarding)/plans')
    } catch (err: unknown) {
      logger.error('gymOnboarding', 'equipment', err)
      const message = err instanceof Error ? err.message : 'Could not save equipment.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  const grouped = items.reduce<Record<string, EquipmentItem[]>>((acc, item) => {
    acc[item.category] = acc[item.category] ?? []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <OnboardingShell
      step={2}
      title="What equipment do you have?"
      subtitle="Helps members find gyms with the gear they need."
      footer={
        <WButton
          label={selected.size > 0 ? `Continue (${selected.size} selected)` : 'Continue'}
          variant="green"
          onPress={handleNext}
          loading={loading}
        />
      }
    >
      {fetching ? (
        <ActivityIndicator color={colors.text} style={{ marginTop: 40 }} />
      ) : (
        Object.entries(grouped).map(([category, categoryItems]) => (
          <View key={category} style={{ marginBottom: 24 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted, marginBottom: 10 }}>
              {CATEGORY_LABELS[category] ?? category}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {categoryItems.map((item) => {
                const isSelected = selected.has(item.id)
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggle(item.id)}
                    activeOpacity={0.8}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.text : colors.border,
                      backgroundColor: isSelected ? colors.stone2 : colors.surface,
                    }}
                  >
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.text }}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))
      )}
    </OnboardingShell>
  )
}
