import { useCallback, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useFocusEffect, router } from 'expo-router'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { WCard } from '@/components/ui/WCard'
import { WBadge } from '@/components/ui/WBadge'
import { WButton } from '@/components/ui/WButton'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatCurrency, formatCurrencyShort } from '@/lib/utils/formatCurrency'
import { formatDate } from '@/lib/utils/formatDate'
import type { SubscriptionTier } from '@/types/database'

interface GymDetail {
  id: string
  name: string
  city: string
  address: string
  phone: string
  email: string
  description: string
  logoUrl: string | null
  isActive: boolean
  setupSubmitted: boolean
  status: 'active' | 'pending' | 'inactive'
  tier: SubscriptionTier
  createdAt: string
  owner: string
  ownerEmail: string
  ownerPhone: string
  ownerId: string | null
  members: number
  revenue: number
  setup: {
    details: boolean
    equipment: boolean
    plans: boolean
    trainers: boolean
    payout: boolean
  }
}

const SETUP_STEPS = [
  { key: 'details', label: 'Gym Details' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'plans', label: 'Membership Plans' },
  { key: 'trainers', label: 'Trainers' },
  { key: 'payout', label: 'Payout Setup' },
] as const

function initials(name: string) {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default function SuperAdminGymDetailScreen() {
  const colors = useColors()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [gym, setGym] = useState<GymDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('free')

  const load = useCallback(async () => {
    if (!id) return
    try {
      const { data: g, error } = await supabase
        .from('gyms')
        .select(`
          id, name, city, address, phone, email, description, logo_url,
          is_active, setup_submitted, subscription_tier, created_at,
          setup_gym_details, setup_equipment, setup_plans, setup_trainers, setup_payout,
          gym_admins(user_id, users(full_name, email, phone))
        `)
        .eq('id', id)
        .single()
      if (error) throw error

      const [membersRes, revenueRes] = await Promise.all([
        supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('gym_id', id).eq('status', 'active'),
        supabase.from('memberships').select('amount_paid_naira').eq('gym_id', id),
      ])
      if (membersRes.error) throw membersRes.error
      if (revenueRes.error) throw revenueRes.error

      const admin = (g.gym_admins as any)?.[0]
      const owner = admin?.users as { full_name: string; email: string; phone: string | null } | null

      const detail: GymDetail = {
        id: g.id,
        name: g.name,
        city: g.city || '—',
        address: g.address || '—',
        phone: g.phone || '—',
        email: g.email || '—',
        description: g.description || '',
        logoUrl: g.logo_url,
        isActive: Boolean(g.is_active),
        setupSubmitted: Boolean(g.setup_submitted),
        status: g.is_active ? 'active' : (g.setup_submitted ? 'pending' : 'inactive'),
        tier: (g.subscription_tier === 'pro' ? 'pro' : 'free'),
        createdAt: g.created_at ?? new Date(0).toISOString(),
        owner: owner?.full_name || '—',
        ownerEmail: owner?.email || '—',
        ownerPhone: owner?.phone || '—',
        ownerId: admin?.user_id ?? null,
        members: membersRes.count ?? 0,
        revenue: (revenueRes.data ?? []).reduce((sum, m) => sum + (m.amount_paid_naira || 0), 0),
        setup: {
          details: Boolean(g.setup_gym_details),
          equipment: Boolean(g.setup_equipment),
          plans: Boolean(g.setup_plans),
          trainers: Boolean(g.setup_trainers),
          payout: Boolean(g.setup_payout),
        },
      }
      setGym(detail)
      setSelectedTier(detail.tier === 'pro' ? 'pro' : 'free')
    } catch (err) {
      logger.error('superAdmin', 'fetchGymDetail', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function handleApprove() {
    if (!gym) return
    setBusy(true)
    try {
      const { error: gymError } = await supabase.from('gyms').update({ is_active: true }).eq('id', gym.id)
      if (gymError) throw gymError

      if (gym.ownerId) {
        await supabase.from('users').update({ role: 'gym_admin' }).eq('id', gym.ownerId)
      }

      Alert.alert('Approved', `${gym.name} has been approved and is now live on WorkIt.`)
      router.back()
    } catch (err) {
      logger.error('superAdmin', 'approveGym', err)
      Alert.alert('Error', `Failed to approve ${gym.name}.`)
    } finally {
      setBusy(false)
    }
  }

  async function handleReturnForRevision() {
    if (!gym) return
    setBusy(true)
    try {
      const { error } = await supabase.from('gyms').update({ setup_submitted: false }).eq('id', gym.id)
      if (error) throw error
      Alert.alert('Returned', `${gym.name}'s application has been returned for revision.`)
      router.back()
    } catch (err) {
      logger.error('superAdmin', 'returnGymForRevision', err)
      Alert.alert('Error', 'Failed to return application for revision.')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleLive() {
    if (!gym) return
    setBusy(true)
    try {
      const newActive = !gym.isActive
      const { error } = await supabase.from('gyms').update({ is_active: newActive }).eq('id', gym.id)
      if (error) throw error
      setGym((prev) => (prev ? { ...prev, isActive: newActive, status: newActive ? 'active' : 'inactive' } : prev))
    } catch (err) {
      logger.error('superAdmin', 'toggleGymLive', err)
      Alert.alert('Error', 'Failed to update gym visibility.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveTier() {
    if (!gym) return
    setBusy(true)
    try {
      const { error } = await supabase
        .from('gyms')
        .update({ subscription_tier: selectedTier })
        .eq('id', gym.id)
      if (error) throw error
      setGym((prev) => (prev ? { ...prev, tier: selectedTier } : prev))
      Alert.alert('Saved', `${gym.name} updated to ${selectedTier} plan.`)
    } catch (err) {
      logger.error('superAdmin', 'updateGymTier', err)
      Alert.alert('Error', 'Failed to update subscription tier.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.obsidian, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} />
      </View>
    )
  }

  if (!gym) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.obsidian, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', color: colors.slate, textAlign: 'center' }}>
          Gym not found.
        </Text>
      </View>
    )
  }

  const docsCount = Object.values(gym.setup).filter(Boolean).length
  const badgeVariant = gym.status === 'active' ? 'green' : gym.status === 'pending' ? 'amber' : 'ember'
  const isPendingReview = gym.setupSubmitted && !gym.isActive

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.white }}>Gym Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: colors.deep,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.green }}>{initials(gym.name)}</Text>
          </View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.white, textAlign: 'center' }}>{gym.name}</Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate, marginTop: 4 }}>{gym.city}</Text>
          {!!gym.description && (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate, marginTop: 8, lineHeight: 19, textAlign: 'center' }}>
              {gym.description}
            </Text>
          )}
          <View style={{ marginTop: 10 }}>
            <WBadge
              label={gym.status === 'pending' ? 'Pending Review' : gym.status.charAt(0).toUpperCase() + gym.status.slice(1)}
              variant={badgeVariant}
            />
          </View>
        </View>

        {isPendingReview && (
          <>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
              Owner Details
            </Text>
            <WCard style={{ marginBottom: 20, gap: 12 }}>
              {[
                { label: 'Name', value: gym.owner },
                { label: 'Email', value: gym.ownerEmail },
                { label: 'Phone', value: gym.ownerPhone },
              ].map((row) => (
                <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.slate }}>{row.label}</Text>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white }}>{row.value}</Text>
                </View>
              ))}
            </WCard>
          </>
        )}

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
          Gym Info
        </Text>
        <WCard style={{ marginBottom: 20, gap: 12 }}>
          {[
            { label: 'Address', value: gym.address },
            { label: 'Phone', value: gym.phone },
            { label: 'Email', value: gym.email },
            { label: gym.status === 'pending' ? 'Submitted' : 'Joined', value: formatDate(gym.createdAt) },
          ].map((row) => (
            <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.slate }}>{row.label}</Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white }}>{row.value}</Text>
            </View>
          ))}
        </WCard>

        {!isPendingReview && (
          <>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
              Owner
            </Text>
            <WCard style={{ marginBottom: 20, gap: 12 }}>
              {[
                { label: 'Name', value: gym.owner },
                { label: 'Email', value: gym.ownerEmail },
              ].map((row) => (
                <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.slate }}>{row.label}</Text>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white }}>{row.value}</Text>
                </View>
              ))}
            </WCard>
          </>
        )}

        {isPendingReview ? (
          <>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
              Setup Checklist
            </Text>
            <WCard style={{ marginBottom: 20, gap: 8 }}>
              {SETUP_STEPS.map((step) => {
                const complete = gym.setup[step.key]
                return (
                  <View
                    key={step.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      backgroundColor: colors.adminSurface,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.adminBorder,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {complete ? (
                        <CheckCircle2 size={16} color={colors.green} strokeWidth={2} />
                      ) : (
                        <AlertCircle size={16} color={colors.amber} strokeWidth={2} />
                      )}
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.white }}>{step.label}</Text>
                    </View>
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: complete ? colors.green : colors.amber,
                      }}
                    >
                      {complete ? 'Complete' : 'Incomplete'}
                    </Text>
                  </View>
                )
              })}
            </WCard>

            {docsCount < 5 ? (
              <WCard style={{ backgroundColor: '#1A1200', marginBottom: 24 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.amber, marginBottom: 4 }}>
                  Incomplete Setup
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate, lineHeight: 18 }}>
                  This gym has not completed all setup steps ({docsCount}/5). You can still approve it — the gym admin will be prompted to complete the remaining steps.
                </Text>
              </WCard>
            ) : (
              <WCard style={{ backgroundColor: '#001A0D', marginBottom: 24 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.green, marginBottom: 4 }}>
                  Ready to Go Live
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate, lineHeight: 18 }}>
                  All setup steps are complete. Approving this gym will make it live on WorkIt immediately.
                </Text>
              </WCard>
            )}

            <View style={{ gap: 12 }}>
              <WButton label="Approve & Go Live" variant="green" onPress={handleApprove} loading={busy} />
              <WButton label="Return for Revision" variant="outline" onPress={handleReturnForRevision} loading={busy} />
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
              Subscription Plan
            </Text>
            <WCard style={{ marginBottom: 20, gap: 12 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate }}>
                Current plan:{' '}
                <Text style={{ fontFamily: 'DMSans_500Medium', color: colors.white, textTransform: 'capitalize' }}>
                  {gym.tier}
                </Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['free', 'pro'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setSelectedTier(t)}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 10,
                      borderWidth: 1.5,
                      borderColor: selectedTier === t ? colors.green : colors.adminBorder,
                      backgroundColor: selectedTier === t ? '#001A0D' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 13,
                        color: selectedTier === t ? colors.green : colors.slate,
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.slate, lineHeight: 16 }}>
                Pro (₦25,000/mo) unlocks Messaging, Classes, Referrals, and advanced analytics.
              </Text>
              {selectedTier !== gym.tier && (
                <WButton label="Save Changes" variant="dark" onPress={handleSaveTier} loading={busy} style={{ height: 44 }} />
              )}
            </WCard>

            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.white, marginBottom: 10 }}>
              Stats
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
              <WCard style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 22, color: colors.white }}>{gym.members}</Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate, marginTop: 4 }}>
                  Active Members
                </Text>
              </WCard>
              <WCard style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 22, color: colors.white }}>
                  {gym.revenue > 0 ? formatCurrencyShort(gym.revenue) : formatCurrency(0)}
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate, marginTop: 4 }}>
                  Total Revenue
                </Text>
              </WCard>
            </View>

            <WButton
              label={gym.isActive ? 'Hide from Discover' : 'Go Live'}
              variant={gym.isActive ? 'danger' : 'green'}
              onPress={handleToggleLive}
              loading={busy}
            />
          </>
        )}
      </ScrollView>
    </View>
  )
}
