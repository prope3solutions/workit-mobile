import { useCallback, useMemo, useState } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { Plus, Users, Search } from 'lucide-react-native'
import { colors } from '@/lib/theme/colors'
import { WBadge } from '@/components/ui/WBadge'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatDate } from '@/lib/utils/formatDate'

type FilterTab = 'active' | 'expiring' | 'expired'

interface MemberRow {
  id: string
  memberId: string
  fullName: string
  planName: string
  endDate: string
  status: 'active' | 'expiring' | 'expired'
}

function initials(name: string) {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

const AVATAR_COLORS = ['#00E87A14', '#F59E0B14', '#FF444414', '#6366F114']

export default function MembersScreen() {
  const user = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<FilterTab>('active')
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data: adminRow, error: adminError } = await supabase
        .from('gym_admins')
        .select('gym_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (adminError) throw adminError
      const gymId = adminRow?.gym_id
      if (!gymId) return

      const { data, error } = await supabase
        .from('memberships')
        .select('id, member_id, status, end_date, users!memberships_member_id_fkey(full_name), membership_plans(name)')
        .eq('gym_id', gymId)
        .order('end_date', { ascending: true })
      if (error) throw error

      const now = Date.now()
      const soon = now + 7 * 24 * 60 * 60 * 1000
      const rows: MemberRow[] = (data ?? []).map((m) => {
        const endMs = new Date(m.end_date).getTime()
        let status: MemberRow['status']
        if (m.status === 'expired' || endMs < now) status = 'expired'
        else if (m.status === 'active' && endMs <= soon) status = 'expiring'
        else status = 'active'
        return {
          id: m.id,
          memberId: m.member_id,
          fullName: (m.users as unknown as { full_name: string } | null)?.full_name ?? 'Member',
          planName: (m.membership_plans as unknown as { name: string } | null)?.name ?? 'No plan',
          endDate: m.end_date,
          status,
        }
      })
      setMembers(rows)
    } catch (err) {
      logger.error('gymAdmin', 'fetchMembers', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const counts = useMemo(() => ({
    active: members.filter((m) => m.status === 'active').length,
    expiring: members.filter((m) => m.status === 'expiring').length,
    expired: members.filter((m) => m.status === 'expired').length,
  }), [members])

  const filtered = useMemo(() => {
    const byTab = members.filter((m) => m.status === tab)
    if (!query.trim()) return byTab
    const q = query.trim().toLowerCase()
    return byTab.filter((m) => m.fullName.toLowerCase().includes(q))
  }, [members, tab, query])

  const noMembers = !loading && members.length === 0

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'expiring', label: 'Expiring' },
    { key: 'expired', label: 'Expired' },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: colors.bg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, color: colors.text, letterSpacing: -0.5 }}>Members</Text>
          <TouchableOpacity
            onPress={() => router.push('/(gym-admin)/add-member')}
            style={{
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: colors.obsidian,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Plus size={18} color={colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: colors.surface, borderRadius: 12,
          borderWidth: 1, borderColor: colors.border,
          paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
        }}>
          <Search size={16} color={colors.textMuted} strokeWidth={1.8} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search members..."
            placeholderTextColor={colors.textFaint}
            style={{
              flex: 1, fontFamily: 'DMSans_400Regular',
              fontSize: 15, color: colors.text, padding: 0,
            }}
          />
        </View>

        {/* Filter tabs */}
        {!noMembers && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flex: 1, paddingVertical: 9, borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: tab === t.key ? colors.obsidian : colors.surface,
                  borderWidth: 1,
                  borderColor: tab === t.key ? colors.obsidian : colors.border,
                }}
              >
                <Text style={{
                  fontFamily: 'DMSans_500Medium', fontSize: 13,
                  color: tab === t.key ? colors.white : colors.textMuted,
                }}>
                  {t.label} ({counts[t.key]})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Empty — no members at all */}
      {noMembers ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 }}>
          <View style={{
            width: 64, height: 64, borderRadius: 32,
            backgroundColor: colors.stone2,
            alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Users size={28} color={colors.textMuted} strokeWidth={1.5} />
          </View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 6, textAlign: 'center' }}>
            No members yet
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
            Add your first member to start tracking plans and check-ins.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(gym-admin)/add-member')}
            style={{
              backgroundColor: colors.obsidian, borderRadius: 12,
              paddingHorizontal: 24, paddingVertical: 12,
              flexDirection: 'row', alignItems: 'center', gap: 8,
            }}
          >
            <Plus size={16} color={colors.white} strokeWidth={2.5} />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white }}>Add member</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 48 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text, marginBottom: 4 }}>
                No {tab} members
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>
                {query ? `No results for "${query}"` : `You have no ${tab} memberships right now.`}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length]
            return (
              <TouchableOpacity
                onPress={() => router.push(`/(gym-admin)/member/${item.memberId}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  gap: 12,
                }}
              >
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: avatarBg,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 14, color: colors.text }}>
                    {initials(item.fullName)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>
                    {item.fullName}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                    {item.planName} · Exp {formatDate(item.endDate)}
                  </Text>
                </View>
                {item.status === 'expired'
                  ? <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.green }}>Renew →</Text>
                  : <WBadge label={item.status === 'active' ? 'Active' : 'Expiring'} variant={item.status === 'active' ? 'green' : 'amber'} />
                }
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}
