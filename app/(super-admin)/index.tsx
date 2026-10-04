import { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { useColors } from '@/lib/theme/colors'
import { WBadge } from '@/components/ui/WBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

interface PendingGym {
  id: string
  name: string
  city: string
  owner: string
  createdAt: string
  docsCount: number
}

function daysAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default function SuperAdminApprovalsScreen() {
  const colors = useColors()
  const [gyms, setGyms] = useState<PendingGym[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('gyms')
        .select(`
          id, name, city, created_at,
          setup_gym_details, setup_equipment, setup_plans, setup_trainers, setup_payout,
          gym_admins(users(full_name))
        `)
        .eq('setup_submitted', true)
        .eq('is_active', false)
        .order('created_at', { ascending: false })
      if (error) throw error

      const mapped: PendingGym[] = (data ?? []).map((g) => {
        const owner = (g.gym_admins as any)?.[0]?.users as { full_name: string } | undefined
        const docsCount = [g.setup_gym_details, g.setup_equipment, g.setup_plans, g.setup_trainers, g.setup_payout].filter(
          Boolean
        ).length
        return {
          id: g.id,
          name: g.name,
          city: g.city || '—',
          owner: owner?.full_name || '—',
          createdAt: g.created_at ?? new Date(0).toISOString(),
          docsCount,
        }
      })
      setGyms(mapped)
    } catch (err) {
      logger.error('superAdmin', 'fetchPendingGyms', err)
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

  const Header = (
    <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 28, color: colors.white }}>Approvals</Text>
        {!loading && gyms.length > 0 && (
          <View style={{ backgroundColor: '#1A1200', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
            <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: colors.amber }}>{gyms.length}</Text>
          </View>
        )}
      </View>
      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.slate, marginTop: 4 }}>
        Review and onboard new gym partners.
      </Text>
    </View>
  )

  if (!loading && gyms.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
        {Header}
        <EmptyState title="No pending applications" subtitle="New submissions will appear here." />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
      {Header}

      <FlatList
        data={gyms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(super-admin)/gym/[id]', params: { id: item.id } })}
            style={{
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.adminBorder,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.white }}>{item.name}</Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate, marginTop: 2 }}>
                  {item.city} · {item.owner}
                </Text>
              </View>
              <WBadge label="Pending Review" variant="amber" />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate }}>
                {daysAgo(item.createdAt)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 60, height: 6, borderRadius: 3, backgroundColor: colors.adminBorder, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${(item.docsCount / 5) * 100}%`,
                      height: '100%',
                      backgroundColor: item.docsCount === 5 ? colors.green : colors.amber,
                    }}
                  />
                </View>
                <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: colors.slate }}>
                  {item.docsCount}/5
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}
