import { useCallback, useMemo, useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { useColors } from '@/lib/theme/colors'
import { WBadge } from '@/components/ui/WBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { TrainerStatus } from '@/types/database'

type FilterTab = 'pending_review' | 'approved' | 'rejected' | 'more_info_requested' | 'paused' | 'all'

interface TrainerRow {
  id: string
  displayName: string
  city: string
  phone: string
  yearsExperience: number | null
  status: TrainerStatus
}

const FILTERS: FilterTab[] = ['pending_review', 'approved', 'rejected', 'more_info_requested', 'paused', 'all']

const FILTER_LABEL: Record<FilterTab, string> = {
  pending_review: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  more_info_requested: 'More Info',
  paused: 'Paused',
  all: 'All',
}

const badgeVariant = (status: TrainerStatus) =>
  status === 'approved' ? 'green' : status === 'pending_review' || status === 'more_info_requested' ? 'amber' : status === 'rejected' ? 'ember' : 'slate'

function statusLabel(status: TrainerStatus) {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function SuperAdminTrainersScreen() {
  const colors = useColors()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterTab>('pending_review')
  const [trainers, setTrainers] = useState<TrainerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('trainer_profiles')
        .select('id, display_name, city, phone, years_experience, status')
        .order('created_at', { ascending: false })
      if (error) throw error

      const mapped: TrainerRow[] = (data ?? []).map((t) => ({
        id: t.id,
        displayName: t.display_name,
        city: t.city || '—',
        phone: t.phone || '—',
        yearsExperience: t.years_experience,
        status: t.status as TrainerStatus,
      }))
      setTrainers(mapped)
    } catch (err) {
      logger.error('superAdmin', 'fetchAllTrainers', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const filtered = useMemo(() => {
    return trainers.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        if (!t.displayName.toLowerCase().includes(q) && !t.city.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [trainers, filter, query])

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 28, color: colors.white }}>Trainers</Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.slate, marginTop: 4 }}>
          {loading ? 'Loading...' : `Managing ${trainers.length} trainer${trainers.length !== 1 ? 's' : ''} on WorkIt.`}
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search trainers..."
          placeholderTextColor={colors.slate}
          style={{
            backgroundColor: colors.deep,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontFamily: 'DMSans_400Regular',
            fontSize: 15,
            color: colors.white,
            marginTop: 16,
            marginBottom: 12,
          }}
        />

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              onPress={() => setFilter(f)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 10,
                alignItems: 'center',
                backgroundColor: filter === f ? colors.deep : 'transparent',
                borderWidth: 1,
                borderColor: filter === f ? colors.adminBorder : 'transparent',
              }}
            >
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 13,
                  color: filter === f ? colors.white : colors.slate,
                }}
              >
                {FILTER_LABEL[f]}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {!loading && filtered.length === 0 ? (
        <EmptyState title="No trainers found" subtitle="Try a different search or filter." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(super-admin)/trainer/[id]', params: { id: item.id } })}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.adminBorder,
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.white }}>{item.displayName}</Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate, marginTop: 2 }}>
                  {item.city} · {item.phone}
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate, marginTop: 4 }}>
                  {item.yearsExperience != null ? `${item.yearsExperience} yrs experience` : 'Experience not set'}
                </Text>
              </View>

              <WBadge label={statusLabel(item.status)} variant={badgeVariant(item.status)} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
