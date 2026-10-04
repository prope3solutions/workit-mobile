import { useCallback, useMemo, useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { Plus } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { WBadge } from '@/components/ui/WBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatCurrencyShort } from '@/lib/utils/formatCurrency'

type GymStatus = 'active' | 'pending' | 'inactive'
type FilterTab = 'all' | GymStatus

interface GymRow {
  id: string
  name: string
  city: string
  owner: string
  members: number
  revenue: number
  isActive: boolean
  status: GymStatus
}

const badgeVariant = (status: GymStatus) => (status === 'active' ? 'green' : status === 'pending' ? 'amber' : 'ember')

export default function SuperAdminGymsScreen() {
  const colors = useColors()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [gyms, setGyms] = useState<GymRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gyms')
        .select('id, name, city, is_active, setup_submitted, gym_admins(users(full_name))')
        .order('created_at', { ascending: false })
      if (error) throw error

      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('gym_id, status, amount_paid_naira')
      if (membershipsError) throw membershipsError

      const memberCountMap: Record<string, number> = {}
      const revenueMap: Record<string, number> = {}
      ;(memberships ?? []).forEach((m) => {
        if (m.status === 'active') memberCountMap[m.gym_id] = (memberCountMap[m.gym_id] || 0) + 1
        revenueMap[m.gym_id] = (revenueMap[m.gym_id] || 0) + (m.amount_paid_naira || 0)
      })

      const mapped: GymRow[] = (data ?? []).map((g) => {
        const owner = (g.gym_admins as any)?.[0]?.users as { full_name: string } | undefined
        return {
          id: g.id,
          name: g.name,
          city: g.city || '—',
          owner: owner?.full_name || '—',
          members: memberCountMap[g.id] || 0,
          revenue: revenueMap[g.id] || 0,
          isActive: Boolean(g.is_active),
          status: g.is_active ? 'active' : g.setup_submitted ? 'pending' : 'inactive',
        }
      })
      setGyms(mapped)
    } catch (err) {
      logger.error('superAdmin', 'fetchAllGyms', err)
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
    return gyms.filter((g) => {
      if (filter !== 'all' && g.status !== filter) return false
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        if (!g.name.toLowerCase().includes(q) && !g.city.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [gyms, filter, query])

  async function handleToggleLive(gym: GymRow) {
    setTogglingId(gym.id)
    try {
      const newActive = !gym.isActive
      const { error } = await supabase.from('gyms').update({ is_active: newActive }).eq('id', gym.id)
      if (error) throw error
      setGyms((prev) =>
        prev.map((g) =>
          g.id === gym.id
            ? { ...g, isActive: newActive, status: newActive ? 'active' : g.status === 'active' ? 'inactive' : g.status }
            : g
        )
      )
    } catch (err) {
      logger.error('superAdmin', 'toggleGymLiveFromList', err)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 28, color: colors.white }}>All Gyms</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.slate, marginTop: 4 }}>
              {loading ? 'Loading...' : `Managing ${gyms.length} gym${gyms.length !== 1 ? 's' : ''} on WorkIt.`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(super-admin)/create-gym')}
            hitSlop={12}
            style={{
              width: 40, height: 40, borderRadius: 12,
              backgroundColor: colors.deep, alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={20} color={colors.green} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search gyms..."
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

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['all', 'active', 'pending', 'inactive'] as FilterTab[]).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={{
                flex: 1,
                paddingVertical: 10,
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
                  textTransform: 'capitalize',
                }}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {!loading && filtered.length === 0 ? (
        <EmptyState title="No gyms found" subtitle="Try a different search or filter." />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(super-admin)/gym/[id]', params: { id: item.id } })}
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
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.white }}>{item.name}</Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate, marginTop: 2 }}>
                  {item.city} · {item.owner}
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate, marginTop: 4 }}>
                  {item.members} members · {item.revenue > 0 ? formatCurrencyShort(item.revenue) : '₦0'}
                </Text>
              </View>

              <WBadge
                label={item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                variant={badgeVariant(item.status)}
              />

              <TouchableOpacity
                onPress={() => handleToggleLive(item)}
                disabled={togglingId === item.id}
                hitSlop={8}
                style={{
                  width: 40,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: item.isActive ? colors.green : colors.adminBorder,
                  justifyContent: 'center',
                  opacity: togglingId === item.id ? 0.6 : 1,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: colors.white,
                    marginLeft: item.isActive ? 19 : 3,
                  }}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}
