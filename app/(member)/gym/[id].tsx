import { useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { useRef } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import {
  ChevronLeft,
  MapPin,
  Star,
  ShieldCheck,
  Check,
  Dumbbell,
  Bike,
  Zap,
  Weight,
  Heart,
} from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { TrainerCard } from '@/components/member/TrainerCard'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import { JoinGymSheet } from '@/components/shared/JoinGymSheet'

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

interface Gym {
  id: string
  name: string
  slug: string
  description: string | null
  address: string
  city: string
  state: string
  logoUrl: string | null
  coverImageUrl: string | null
  isVerified: boolean
  rating: number
  reviewCount: number
  tags: string[]
}

interface Plan {
  id: string
  name: string
  description: string | null
  priceNaira: number
  durationDays: number
  features: string[]
}

interface Coach {
  id: string
  fullName: string
  specialty: string[]
  photoUrl: string | null
}

interface AvailableTrainer {
  id: string
  displayName: string
  photoUrl: string | null
  avgRating: number
  reviewCount: number
  yearsExperience: number | null
  specializations: string[]
  isIndependent: boolean
  startingPriceNaira: number | null
}

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  reviewerName: string
}

interface EquipmentItem {
  id: string
  name: string
  category: string
}

const { width: SW } = Dimensions.get('window')
const CARD_W = (SW - 20 * 2 - 10) / 2

function categoryIcon(cat: string) {
  if (cat === 'cardio') return Bike
  if (cat === 'strength') return Weight
  return Zap
}

function reviewerLabel(fullName: string) {
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

function EquipmentCard({ name, Icon }: { name: string; Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }> }) {
  const colors = useColors()
  return (
    <View style={{
      width: CARD_W,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    }}>
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: colors.stone2,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={colors.textMuted} strokeWidth={1.75} />
      </View>
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.text, lineHeight: 18 }}>
        {name}
      </Text>
    </View>
  )
}

function PlanRow({ plan }: { plan: Plan }) {
  const colors = useColors()
  return (
    <View style={{
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ gap: 3 }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, letterSpacing: -0.34, color: colors.text }}>
            {plan.name}
          </Text>
          {plan.description ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>{plan.description}</Text>
          ) : null}
        </View>
        <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 20, letterSpacing: -0.4, color: colors.text }}>
          {formatPrice(plan.priceNaira)}
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        {plan.features.map(f => (
          <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Check size={13} color={colors.green} strokeWidth={2.5} />
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const colors = useColors()
  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: 16,
      borderWidth: 1, borderColor: colors.border,
      padding: 14, gap: 10,
      width: 260,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{
          width: 34, height: 34, borderRadius: 17,
          backgroundColor: colors.stone2,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 12, color: colors.textMuted }}>
            {review.reviewerName.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.text }}>{review.reviewerName}</Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint }}>
            {new Date(review.createdAt).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {Array.from({ length: review.rating }).map((_, i) => (
            <Star key={i} size={11} color={colors.amber} fill={colors.amber} strokeWidth={0} />
          ))}
        </View>
      </View>
      {review.comment ? (
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, lineHeight: 20 }}>
          {review.comment}
        </Text>
      ) : null}
    </View>
  )
}

type Tab = 'Overview' | 'Equipment' | 'Plans' | 'Trainers'
const TABS: Tab[] = ['Overview', 'Equipment', 'Plans', 'Trainers']

export default function GymProfileScreen() {
  const colors = useColors()
  const { top: safeTop } = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')
  const [saved, setSaved] = useState(false)
  const [showJoinSheet, setShowJoinSheet] = useState(false)
  const btnScale = useRef(new Animated.Value(1)).current

  const [loading, setLoading] = useState(true)
  const [gym, setGym] = useState<Gym | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [availableTrainers, setAvailableTrainers] = useState<AvailableTrainer[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [equipmentGroups, setEquipmentGroups] = useState<{ category: string; items: string[] }[]>([])

  const startingPrice = plans.length > 0 ? Math.min(...plans.map(p => p.priceNaira)) : null

  const load = useCallback(async () => {
    if (!id) return
    try {
      const { data: gymRow, error: gymError } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single()
      if (gymError) throw gymError

      setGym({
        id: gymRow.id,
        name: gymRow.name,
        slug: gymRow.slug,
        description: gymRow.description,
        address: gymRow.address,
        city: gymRow.city,
        state: gymRow.state,
        logoUrl: gymRow.logo_url,
        coverImageUrl: gymRow.cover_image_url,
        isVerified: gymRow.is_verified ?? false,
        rating: gymRow.rating ?? 0,
        reviewCount: gymRow.review_count ?? 0,
        tags: gymRow.tags ?? [],
      })

      const [plansRes, coachesRes, affiliationsRes, reviewsRes, gymEquipRes] = await Promise.all([
        supabase
          .from('membership_plans')
          .select('id, name, description, price_naira, duration_days, features')
          .eq('gym_id', id)
          .eq('is_active', true)
          .order('price_naira', { ascending: true }),
        supabase
          .from('trainers')
          .select('id, full_name, specialty, photo_url')
          .eq('gym_id', id)
          .eq('is_active', true),
        supabase
          .from('trainer_gym_affiliations')
          .select('trainer_profiles(id, display_name, photo_url, avg_rating, review_count, years_experience, specializations, is_independent, status, availability_paused, trainer_pricing(amount_naira, is_active))')
          .eq('gym_id', id),
        supabase
          .from('gym_reviews')
          .select('id, rating, comment, member_id, created_at')
          .eq('gym_id', id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('gym_equipment')
          .select('equipment_id, quantity')
          .eq('gym_id', id),
      ])

      if (plansRes.error) throw plansRes.error
      if (coachesRes.error) throw coachesRes.error
      if (affiliationsRes.error) throw affiliationsRes.error
      if (reviewsRes.error) throw reviewsRes.error
      if (gymEquipRes.error) throw gymEquipRes.error

      setPlans((plansRes.data ?? []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        priceNaira: p.price_naira,
        durationDays: p.duration_days,
        features: Array.isArray(p.features) ? p.features.filter((feature): feature is string => typeof feature === 'string') : [],
      })))

      setCoaches((coachesRes.data ?? []).map(t => ({
        id: t.id,
        fullName: t.full_name,
        specialty: t.specialty ?? [],
        photoUrl: t.photo_url,
      })))

      const trainers = (affiliationsRes.data ?? [])
        .map(row => row.trainer_profiles as unknown as {
          id: string
          display_name: string
          photo_url: string | null
          avg_rating: number
          review_count: number
          years_experience: number | null
          specializations: string[] | null
          is_independent: boolean
          status: string
          availability_paused: boolean
          trainer_pricing: { amount_naira: number; is_active: boolean }[] | null
        } | null)
        .filter((t): t is NonNullable<typeof t> => !!t && t.status === 'approved' && !t.availability_paused)

      setAvailableTrainers(trainers.map(t => {
        const activePricing = (t.trainer_pricing ?? []).filter(p => p.is_active)
        const startingPriceNaira = activePricing.length > 0 ? Math.min(...activePricing.map(p => p.amount_naira)) : null
        return {
          id: t.id,
          displayName: t.display_name,
          photoUrl: t.photo_url,
          avgRating: t.avg_rating ?? 0,
          reviewCount: t.review_count ?? 0,
          yearsExperience: t.years_experience,
          specializations: t.specializations ?? [],
          isIndependent: t.is_independent ?? false,
          startingPriceNaira,
        }
      }))

      const reviewRows = reviewsRes.data ?? []
      const memberIds = Array.from(new Set(reviewRows.map(r => r.member_id)))
      let namesById: Record<string, string> = {}
      if (memberIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', memberIds)
        if (usersError) throw usersError
        namesById = Object.fromEntries((usersData ?? []).map(u => [u.id, u.full_name]))
      }
      setReviews(reviewRows.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at ?? new Date(0).toISOString(),
        reviewerName: reviewerLabel(namesById[r.member_id] ?? 'Member'),
      })))

      const gymEquipRows = gymEquipRes.data ?? []
      const equipmentIds = gymEquipRows.map(r => r.equipment_id)
      if (equipmentIds.length > 0) {
        const { data: equipData, error: equipError } = await supabase
          .from('equipment')
          .select('id, name, category')
          .in('id', equipmentIds)
        if (equipError) throw equipError
        const byCategory = new Map<string, string[]>()
        for (const e of (equipData ?? []) as EquipmentItem[]) {
          const list = byCategory.get(e.category) ?? []
          list.push(e.name)
          byCategory.set(e.category, list)
        }
        setEquipmentGroups(Array.from(byCategory.entries()).map(([category, items]) => ({ category, items })))
      } else {
        setEquipmentGroups([])
      }
    } catch (err) {
      logger.error('gymProfile', 'fetchGymProfile', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function handleJoin() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowJoinSheet(true)
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} />
      </View>
    )
  }

  if (!gym) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, textAlign: 'center' }}>
          Gym not found.
        </Text>
      </View>
    )
  }

  const heroHeight = safeTop + 220

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/(member)')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 124 }}>

        {/* Full-bleed hero image with floating nav buttons */}
        <View style={{ width: '100%', height: heroHeight, backgroundColor: colors.stone2, overflow: 'hidden' }}>
          {gym.coverImageUrl ? (
            <Image source={{ uri: gym.coverImageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 11, letterSpacing: 1.2, color: colors.textFaint }}>
                GYM · {gym.name.toUpperCase()} · COVER
              </Text>
            </View>
          )}

          {/* Floating back button */}
          <Pressable
            onPress={handleBack}
            style={{
              position: 'absolute',
              top: safeTop + 10,
              left: 16,
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(0,0,0,0.35)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.2} />
          </Pressable>

          {/* Floating heart button — top-right of the hero image */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setSaved(s => !s)
            }}
            style={{
              position: 'absolute',
              top: safeTop + 10,
              right: 16,
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(0,0,0,0.35)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Heart
              size={18}
              color={saved ? '#E11D48' : '#FFFFFF'}
              fill={saved ? '#E11D48' : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, letterSpacing: -0.52, color: colors.text }}>
              {gym.name}
            </Text>
            {gym.isVerified && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: colors.stone2,
                borderRadius: 999, borderWidth: 1, borderColor: colors.border,
                paddingHorizontal: 8, paddingVertical: 3,
              }}>
                <ShieldCheck size={11} color={colors.greenDeep} strokeWidth={2.5} />
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: colors.text }}>Verified</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <MapPin size={13} color={colors.textMuted} strokeWidth={2} />
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>
              {gym.address} · {gym.city}, {gym.state}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Star size={13} color={colors.amber} fill={colors.amber} strokeWidth={0} />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{gym.rating}</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>({gym.reviewCount} reviews)</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View style={{
            flexDirection: 'row',
            backgroundColor: colors.stone2,
            borderRadius: 999,
            padding: 4,
            gap: 2,
          }}>
            {TABS.map(tab => {
              const active = activeTab === tab
              return (
                <Pressable
                  key={tab}
                  onPress={() => { setActiveTab(tab); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
                  style={{
                    flex: 1, alignItems: 'center',
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? colors.surface : 'transparent',
                    shadowColor: active ? '#000' : 'transparent',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: active ? 0.08 : 0,
                    shadowRadius: 3,
                    elevation: active ? 2 : 0,
                  }}
                >
                  <Text style={{
                    fontFamily: 'DMSans_500Medium', fontSize: 13,
                    color: active ? colors.text : colors.textMuted,
                  }}>
                    {tab}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {activeTab === 'Overview' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 22 }}>
            {gym.description ? (
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, lineHeight: 24 }}>
                {gym.description}
              </Text>
            ) : null}

            {gym.tags.length > 0 && (
              <View>
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: colors.text, marginBottom: 12 }}>
                  Services
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {gym.tags.map(t => (
                    <View key={t} style={{
                      backgroundColor: colors.surface,
                      borderRadius: 999,
                      borderWidth: 1, borderColor: colors.border,
                      paddingHorizontal: 14, paddingVertical: 8,
                    }}>
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.text }}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: colors.text, marginBottom: 12 }}>
                Location
              </Text>
              <View style={{
                height: 130, borderRadius: 14,
                backgroundColor: colors.stone2, borderWidth: 1, borderColor: colors.border,
                alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <MapPin size={22} color={colors.textMuted} strokeWidth={1.75} />
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>{gym.address}</Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint }}>map · embedded</Text>
              </View>
            </View>

            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: colors.text }}>
                    Reviews
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Star size={12} color={colors.amber} fill={colors.amber} strokeWidth={0} />
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.text }}>{gym.rating}</Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>({gym.reviewCount})</Text>
                  </View>
                </View>
              </View>
              {reviews.length === 0 ? (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>
                  No reviews yet.
                </Text>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingRight: 20 }}
                  style={{ marginHorizontal: -20 }}
                >
                  <View style={{ width: 20 }} />
                  {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
                </ScrollView>
              )}
            </View>
          </View>
        )}

        {activeTab === 'Equipment' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 24 }}>
            {equipmentGroups.length === 0 ? (
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>
                No equipment listed yet.
              </Text>
            ) : (
              equipmentGroups.map(group => {
                const Icon = categoryIcon(group.category)
                return (
                  <View key={group.category}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Icon size={16} color={colors.textMuted} strokeWidth={1.75} />
                      <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 15, letterSpacing: -0.3, color: colors.text, flex: 1, textTransform: 'capitalize' }}>
                        {group.category}
                      </Text>
                      <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: colors.textFaint }}>
                        {group.items.length}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {group.items.map(item => (
                        <EquipmentCard key={item} name={item} Icon={Dumbbell} />
                      ))}
                    </View>
                  </View>
                )
              })
            )}
          </View>
        )}

        {activeTab === 'Plans' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 10 }}>
            {plans.length === 0 ? (
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>
                No plans available right now.
              </Text>
            ) : (
              plans.map(p => <PlanRow key={p.id} plan={p} />)
            )}
          </View>
        )}

        {activeTab === 'Trainers' && (
          <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 28 }}>

            <View>
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: colors.text }}>
                  Gym Coaches
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Employed by {gym.name}
                </Text>
              </View>
              {coaches.length === 0 ? (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>
                  No coaches listed yet.
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {coaches.map(t => (
                    <TrainerCard
                      key={t.id}
                      id={t.id}
                      displayName={t.fullName}
                      photoUrl={t.photoUrl}
                      rating={0}
                      reviewCount={0}
                      yearsExperience={null}
                      primarySpecialization={t.specialty[0] ?? null}
                      startingPriceNaira={null}
                      gymNames={[gym.name]}
                      isIndependent={false}
                      variant="coach"
                      onPress={() => {}}
                    />
                  ))}
                </View>
              )}
            </View>

            <View>
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: colors.text }}>
                    Available Trainers
                  </Text>
                  <View style={{ backgroundColor: colors.green, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: colors.obsidian }}>Available here</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Independent trainers, bookable via WorkIt
                </Text>
              </View>
              {availableTrainers.length === 0 ? (
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>
                  No trainers available at this gym yet.
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {availableTrainers.map(t => (
                    <TrainerCard
                      key={t.id}
                      id={t.id}
                      displayName={t.displayName}
                      photoUrl={t.photoUrl}
                      rating={t.avgRating}
                      reviewCount={t.reviewCount}
                      yearsExperience={t.yearsExperience}
                      primarySpecialization={t.specializations[0] ?? null}
                      startingPriceNaira={t.startingPriceNaira}
                      gymNames={[gym.name]}
                      isIndependent={t.isIndependent}
                      variant="trainer"
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        router.push({ pathname: '/(member)/trainers/[id]', params: { id: t.id, preselectedGymId: gym.id } })
                      }}
                    />
                  ))}
                </View>
              )}
            </View>

          </View>
        )}
      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.surface,
        borderTopWidth: 1, borderTopColor: colors.border,
        paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32,
        flexDirection: 'row', alignItems: 'center', gap: 14,
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 2 }}>
            Starting from
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text, letterSpacing: -0.44 }}>
              {startingPrice != null ? formatCurrency(startingPrice) : '—'}
            </Text>
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            onPress={handleJoin}
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: native, speed: 50, bounciness: 0 }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: native, speed: 30, bounciness: 5 }).start()}
            style={{
              height: 50, paddingHorizontal: 22, borderRadius: 14,
              backgroundColor: colors.green,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 15, color: colors.obsidian, letterSpacing: -0.3 }}>
              Join this gym
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      <JoinGymSheet
        visible={showJoinSheet}
        gymId={id ?? ''}
        gymName={gym?.name ?? ''}
        onClose={() => setShowJoinSheet(false)}
      />
    </View>
  )
}
