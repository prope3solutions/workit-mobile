import { useCallback, useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ChevronLeft, Star, ShieldCheck, MapPin, Phone, Languages, Award, Dumbbell, MessageSquare } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatCurrency } from '@/lib/utils/formatCurrency'
import type { ServiceType, PricingType } from '@/types/database'

interface Certification {
  id: string
  certificationName: string
  issuingOrganization: string
  yearIssued: number
}

interface PricingTier {
  id: string
  pricingType: PricingType
  amountNaira: number
}

interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  reviewerName: string
}

function reviewerLabel(fullName: string) {
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

interface TrainerProfile {
  id: string
  userId: string
  displayName: string
  photoUrl: string | null
  city: string | null
  state: string | null
  yearsExperience: number | null
  bio: string | null
  specializations: string[]
  languagesSpoken: string[]
  serviceTypes: ServiceType[]
  avgRating: number
  reviewCount: number
  isIndependent: boolean
  phone: string
}

const SERVICE_LABELS: Record<string, string> = {
  gym_training: 'Gym Training',
  home_training: 'Home Training',
  online_coaching: 'Online Coaching',
}

const PRICING_LABELS: Record<string, string> = {
  per_session: 'Per Session',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export default function TrainerProfileScreen() {
  const c = useColors()
  const { id, preselectedGymId } = useLocalSearchParams<{ id: string; preselectedGymId?: string }>()
  const user = useAuthStore((s) => s.user)
  const [trainer, setTrainer] = useState<TrainerProfile | null>(null)
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [pricing, setPricing] = useState<PricingTier[]>([])
  const [gymNames, setGymNames] = useState<string[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [canSeePhone, setCanSeePhone] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const { data: profile, error: profileError } = await supabase
        .from('trainer_profiles')
        .select('id, user_id, display_name, photo_url, city, state, years_experience, bio, specializations, languages_spoken, service_types, avg_rating, review_count, is_independent, phone')
        .eq('id', id)
        .eq('status', 'approved')
        .maybeSingle()
      if (profileError) throw profileError
      if (!profile) {
        setTrainer(null)
        return
      }

      setTrainer({
        id: profile.id,
        userId: profile.user_id,
        displayName: profile.display_name,
        photoUrl: profile.photo_url,
        city: profile.city,
        state: profile.state,
        yearsExperience: profile.years_experience,
        bio: profile.bio,
        specializations: profile.specializations ?? [],
        languagesSpoken: profile.languages_spoken ?? [],
        serviceTypes: (profile.service_types as ServiceType[]) ?? [],
        avgRating: profile.avg_rating ?? 0,
        reviewCount: profile.review_count ?? 0,
        isIndependent: profile.is_independent ?? false,
        phone: profile.phone,
      })

      const [certsRes, pricingRes, gymsRes, reviewsRes] = await Promise.all([
        supabase
          .from('trainer_certifications')
          .select('id, certification_name, issuing_organization, year_issued')
          .eq('trainer_id', profile.id),
        supabase
          .from('trainer_pricing')
          .select('id, pricing_type, amount_naira')
          .eq('trainer_id', profile.id)
          .eq('is_active', true)
          .order('amount_naira', { ascending: true }),
        supabase
          .from('trainer_gym_affiliations')
          .select('gyms(name)')
          .eq('trainer_id', profile.id),
        supabase
          .from('trainer_reviews')
          .select('id, rating, comment, member_id, created_at')
          .eq('trainer_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      if (certsRes.error) throw certsRes.error
      if (pricingRes.error) throw pricingRes.error
      if (gymsRes.error) throw gymsRes.error
      if (reviewsRes.error) throw reviewsRes.error

      setCertifications((certsRes.data ?? []).map((cert) => ({
        id: cert.id,
        certificationName: cert.certification_name,
        issuingOrganization: cert.issuing_organization,
        yearIssued: cert.year_issued,
      })))
      setPricing((pricingRes.data ?? []).map((p) => ({
        id: p.id,
        pricingType: p.pricing_type as PricingTier['pricingType'],
        amountNaira: p.amount_naira,
      })))
      setGymNames((gymsRes.data ?? []).map((g) => (g.gyms as unknown as { name: string } | null)?.name).filter((n): n is string => !!n))

      const reviewRows = reviewsRes.data ?? []
      const memberIds = Array.from(new Set(reviewRows.map((r) => r.member_id)))
      let namesById: Record<string, string> = {}
      if (memberIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', memberIds)
        if (usersError) throw usersError
        namesById = Object.fromEntries((usersData ?? []).map((u) => [u.id, u.full_name]))
      }
      setReviews(reviewRows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at ?? new Date(0).toISOString(),
        reviewerName: reviewerLabel(namesById[r.member_id] ?? 'Member'),
      })))

      if (user) {
        const { data: existingBooking, error: bookingError } = await supabase
          .from('bookings')
          .select('id')
          .eq('member_id', user.id)
          .eq('trainer_id', profile.id)
          .limit(1)
          .maybeSingle()
        if (bookingError) throw bookingError
        setCanSeePhone(!!existingBooking)
      }
    } catch (err) {
      logger.error('memberTrainers', 'fetchTrainerProfile', err)
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useFocusEffect(useCallback(() => { load() }, [load]))

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.green} />
      </View>
    )
  }

  if (!trainer) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: c.text, textAlign: 'center' }}>
          Trainer not found.
        </Text>
      </View>
    )
  }

  function initials(name: string) {
    return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 124 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 }}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back() }}
            style={({ pressed }) => ({
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: c.surface,
              borderWidth: 1, borderColor: c.border,
              alignItems: 'center', justifyContent: 'center',
              transform: [{ scale: pressed ? 0.9 : 1 }],
            })}
          >
            <ChevronLeft size={20} color={c.text} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, alignItems: 'center', marginBottom: 20 }}>
          <View style={{
            width: 96, height: 96, borderRadius: 28,
            backgroundColor: c.stone2,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 30, color: c.textMuted }}>
              {initials(trainer.displayName)}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 24, letterSpacing: -0.48, color: c.text }}>
              {trainer.displayName}
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 4,
              backgroundColor: c.stone2,
              borderRadius: 999, borderWidth: 1, borderColor: c.border,
              paddingHorizontal: 8, paddingVertical: 3,
            }}>
              <ShieldCheck size={11} color={c.greenDeep} strokeWidth={2.5} />
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: c.text }}>Verified</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Star size={13} color={c.amber} fill={c.amber} strokeWidth={0} />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: c.text }}>{trainer.avgRating.toFixed(1)}</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: c.textMuted }}>({trainer.reviewCount} reviews)</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <MapPin size={12} color={c.textMuted} strokeWidth={2} />
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: c.textMuted }}>
              {trainer.isIndependent ? 'Independent Trainer' : (trainer.city ?? 'Nigeria')}
              {trainer.yearsExperience ? ` · ${trainer.yearsExperience}y experience` : ''}
            </Text>
          </View>

          {trainer.phone ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
              <Phone size={12} color={c.textMuted} strokeWidth={2} />
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: c.textMuted }}>{trainer.phone}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, gap: 22 }}>
          {trainer.bio && (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: c.textMuted, lineHeight: 24 }}>
              {trainer.bio}
            </Text>
          )}

          {trainer.specializations.length > 0 && (
            <View>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: c.text, marginBottom: 12 }}>
                Specializations
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {trainer.specializations.map((s) => (
                  <View key={s} style={{ backgroundColor: c.surface, borderRadius: 999, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: c.text }}>{s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {trainer.serviceTypes.length > 0 && (
            <View>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: c.text, marginBottom: 12 }}>
                Services offered
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {trainer.serviceTypes.map((s) => (
                  <View key={s} style={{ backgroundColor: c.stone2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: c.textMuted }}>{SERVICE_LABELS[s] ?? s}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {pricing.length > 0 && (
            <View>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: c.text, marginBottom: 12 }}>
                Pricing
              </Text>
              <View style={{ gap: 8 }}>
                {pricing.map((p) => (
                  <View key={p.id} style={{
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    backgroundColor: c.surface, borderRadius: 14,
                    borderWidth: 1, borderColor: c.border,
                    paddingHorizontal: 14, paddingVertical: 13,
                  }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: c.text }}>{PRICING_LABELS[p.pricingType] ?? p.pricingType}</Text>
                    <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: c.greenDeep }}>{formatCurrency(p.amountNaira)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {certifications.length > 0 && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Award size={16} color={c.textMuted} strokeWidth={1.75} />
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: c.text }}>
                  Certifications
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                {certifications.map((cert) => (
                  <View key={cert.id} style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14 }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: c.text }}>{cert.certificationName}</Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: c.textMuted, marginTop: 2 }}>
                      {cert.issuingOrganization} · {cert.yearIssued}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {reviews.length > 0 && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <MessageSquare size={16} color={c.textMuted} strokeWidth={1.75} />
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: c.text }}>
                  Reviews
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                {reviews.map((r) => (
                  <View key={r.id} style={{ backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, padding: 14, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: c.text }}>{r.reviewerName}</Text>
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {Array.from({ length: r.rating }).map((_, i) => (
                          <Star key={i} size={11} color={c.amber} fill={c.amber} strokeWidth={0} />
                        ))}
                      </View>
                    </View>
                    {r.comment ? (
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: c.textMuted, lineHeight: 20 }}>{r.comment}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          )}

          {trainer.languagesSpoken.length > 0 && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Languages size={16} color={c.textMuted} strokeWidth={1.75} />
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: c.text }}>
                  Languages
                </Text>
              </View>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: c.textMuted }}>
                {trainer.languagesSpoken.join(', ')}
              </Text>
            </View>
          )}

          {!trainer.isIndependent && gymNames.length > 0 && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Dumbbell size={16} color={c.textMuted} strokeWidth={1.75} />
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: c.text }}>
                  Works at
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {gymNames.map((name) => (
                  <View key={name} style={{ backgroundColor: c.stone2, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: c.text }}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: c.surface,
        borderTopWidth: 1, borderTopColor: c.border,
        paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32,
      }}>
        <WButton
          label="Book Trainer"
          variant="green"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            router.push({
              pathname: '/(member)/trainers/book/[trainerId]',
              params: preselectedGymId ? { trainerId: trainer.id, preselectedGymId } : { trainerId: trainer.id },
            })
          }}
          disabled={pricing.length === 0}
        />
      </View>
    </View>
  )
}
