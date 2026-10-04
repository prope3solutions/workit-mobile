import { useCallback, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, Modal, ActivityIndicator, FlatList, PanResponder, Animated, Dimensions, StyleSheet } from 'react-native'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import * as Location from 'expo-location'
import {
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  Dumbbell,
  Users,
  TrendingUp,
  Banknote,
  RotateCcw,
} from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { getDistanceMetres, formatDistance } from '@/lib/utils/distance'
import { TRAINER_SPECIALIZATIONS } from '@/lib/constants/trainerSpecializations'
import { GymCard } from '@/components/member/GymCard'
import { TrainerCard } from '@/components/member/TrainerCard'
import type { ServiceType } from '@/types/database'

const SCREEN_W = Dimensions.get('window').width

type Segment = 'gyms' | 'trainers'
type GymSort = 'top_rated' | 'nearby' | 'price_asc'

const MIN_PRICE = 0
const MAX_PRICE = 200000
const MAX_DIST = 50
const THUMB = 24

const styles = StyleSheet.create({
  filterIconButton: {
    width: 46,
    height: 46,
  },
  filterIconVisual: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipPressable: {
    minHeight: 36,
    flexShrink: 0,
  },
  filterChipVisual: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionVisual: {
    width: '100%',
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetPillVisual: {
    minHeight: 38,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCtaVisual: {
    width: '100%',
    minHeight: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
})

// Single-thumb slider — used for distance
function SingleSlider({
  value, min, max, onChange,
}: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const trackW = useRef(0)
  const posX = useRef(new Animated.Value(0)).current
  const startX = useRef(0)
  const startVal = useRef(value)

  function toPos(v: number, w: number) { return ((v - min) / (max - min)) * w }
  function toVal(p: number, w: number) { return Math.round(min + Math.max(0, Math.min(1, p / w)) * (max - min)) }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2,
    onPanResponderGrant: () => {
      startX.current = toPos(startVal.current, trackW.current)
    },
    onPanResponderMove: (_, g) => {
      const p = Math.max(0, Math.min(trackW.current, startX.current + g.dx))
      posX.setValue(p)
      onChange(toVal(p, trackW.current))
    },
    onPanResponderRelease: (_, g) => {
      const p = Math.max(0, Math.min(trackW.current, startX.current + g.dx))
      posX.setValue(p)
      const v = toVal(p, trackW.current)
      startVal.current = v
      onChange(v)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    },
  })).current

  const fillW = posX.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' })

  return (
    <View
      style={{ height: 44, justifyContent: 'center' }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width
        trackW.current = w
        posX.setValue(toPos(value, w))
        startVal.current = value
      }}
    >
      {/* Rail */}
      <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <Animated.View style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: posX, backgroundColor: '#00E87A', borderRadius: 2,
        }} />
      </View>
      {/* Thumb */}
      <Animated.View
        {...pan.panHandlers}
        style={{
          position: 'absolute',
          width: THUMB, height: THUMB, borderRadius: THUMB / 2,
          backgroundColor: '#00E87A',
          borderWidth: 3, borderColor: '#1A1A1A',
          shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
          transform: [{ translateX: Animated.subtract(posX, THUMB / 2) }],
        }}
      />
    </View>
  )
}

// Two-thumb range slider — used for price
function RangeSlider({
  low, high, min, max, onChangeLow, onChangeHigh,
}: {
  low: number; high: number; min: number; max: number;
  onChangeLow: (v: number) => void; onChangeHigh: (v: number) => void
}) {
  const trackW = useRef(0)
  const lowX = useRef(new Animated.Value(0)).current
  const highX = useRef(new Animated.Value(0)).current
  const startLow = useRef(0)
  const startHigh = useRef(0)
  const lowVal = useRef(low)
  const highVal = useRef(high)

  function toPos(v: number, w: number) { return ((v - min) / (max - min)) * w }
  function toVal(p: number, w: number) { return Math.round(min + Math.max(0, Math.min(1, p / w)) * (max - min)) }

  const panLow = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2,
    onPanResponderGrant: () => { startLow.current = toPos(lowVal.current, trackW.current) },
    onPanResponderMove: (_, g) => {
      const maxP = toPos(highVal.current, trackW.current) - THUMB
      const p = Math.max(0, Math.min(maxP, startLow.current + g.dx))
      lowX.setValue(p)
      onChangeLow(toVal(p, trackW.current))
    },
    onPanResponderRelease: (_, g) => {
      const maxP = toPos(highVal.current, trackW.current) - THUMB
      const p = Math.max(0, Math.min(maxP, startLow.current + g.dx))
      lowX.setValue(p)
      const v = toVal(p, trackW.current)
      lowVal.current = v
      onChangeLow(v)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    },
  })).current

  const panHigh = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2,
    onPanResponderGrant: () => { startHigh.current = toPos(highVal.current, trackW.current) },
    onPanResponderMove: (_, g) => {
      const minP = toPos(lowVal.current, trackW.current) + THUMB
      const p = Math.max(minP, Math.min(trackW.current, startHigh.current + g.dx))
      highX.setValue(p)
      onChangeHigh(toVal(p, trackW.current))
    },
    onPanResponderRelease: (_, g) => {
      const minP = toPos(lowVal.current, trackW.current) + THUMB
      const p = Math.max(minP, Math.min(trackW.current, startHigh.current + g.dx))
      highX.setValue(p)
      const v = toVal(p, trackW.current)
      highVal.current = v
      onChangeHigh(v)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    },
  })).current

  const fillLeft = lowX
  const fillWidth = Animated.subtract(highX, lowX)

  return (
    <View
      style={{ height: 44, justifyContent: 'center' }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width
        trackW.current = w
        lowX.setValue(toPos(low, w))
        highX.setValue(toPos(high, w))
        lowVal.current = low
        highVal.current = high
      }}
    >
      {/* Rail */}
      <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' }}>
        <Animated.View style={{
          position: 'absolute', top: 0, bottom: 0,
          left: fillLeft, width: fillWidth,
          backgroundColor: '#00E87A', borderRadius: 2,
        }} />
      </View>
      {/* Low thumb */}
      <Animated.View
        {...panLow.panHandlers}
        style={{
          position: 'absolute',
          width: THUMB, height: THUMB, borderRadius: THUMB / 2,
          backgroundColor: '#00E87A',
          borderWidth: 3, borderColor: '#1A1A1A',
          shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
          transform: [{ translateX: Animated.subtract(lowX, THUMB / 2) }],
        }}
      />
      {/* High thumb */}
      <Animated.View
        {...panHigh.panHandlers}
        style={{
          position: 'absolute',
          width: THUMB, height: THUMB, borderRadius: THUMB / 2,
          backgroundColor: '#00E87A',
          borderWidth: 3, borderColor: '#1A1A1A',
          shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
          transform: [{ translateX: Animated.subtract(highX, THUMB / 2) }],
        }}
      />
    </View>
  )
}

interface GymListItem {
  id: string
  name: string
  city: string
  logoUrl: string | null
  coverImageUrl: string | null
  rating: number
  reviewCount: number
  tags: string[]
  isVerified: boolean
  latitude: number | null
  longitude: number | null
  startingPrice: number | null
  distanceMetres: number | null
}

interface TrainerListItem {
  id: string
  displayName: string
  photoUrl: string | null
  city: string | null
  yearsExperience: number | null
  avgRating: number
  reviewCount: number
  specializations: string[]
  serviceTypes: ServiceType[]
  isIndependent: boolean
  startingPrice: number | null
  gymNames: string[]
}

const SERVICE_FILTERS: { key: ServiceType; label: string }[] = [
  { key: 'gym_training', label: 'Gym Training' },
  { key: 'home_training', label: 'Home Training' },
  { key: 'online_coaching', label: 'Online Coaching' },
]

export default function DiscoverScreen() {
  const c = useColors()
  const params = useLocalSearchParams<{ tab?: string }>()
  const user = useAuthStore((s) => s.user)

  const [segment, setSegment] = useState<Segment>(params.tab === 'trainers' ? 'trainers' : 'gyms')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)

  const [gyms, setGyms] = useState<GymListItem[]>([])
  const [gymSorts, setGymSorts] = useState<Set<GymSort>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [minPriceNaira, setMinPriceNaira] = useState(MIN_PRICE)
  const [maxPriceNaira, setMaxPriceNaira] = useState(MAX_PRICE)
  const [maxDistKm, setMaxDistKm] = useState(MAX_DIST)
  const [locationDenied, setLocationDenied] = useState(false)
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null)

  const [trainers, setTrainers] = useState<TrainerListItem[]>([])
  const [cityFilter, setCityFilter] = useState('')
  const [nearMeCity, setNearMeCity] = useState<string | null>(null)
  const [nearMeActive, setNearMeActive] = useState(false)
  const [locationDeniedTrainer, setLocationDeniedTrainer] = useState(false)
  const [serviceFilters, setServiceFilters] = useState<Set<ServiceType>>(new Set())
  const [specFilters, setSpecFilters] = useState<Set<string>>(new Set())

  const loadGyms = useCallback(async () => {
    try {
      const { data: gymRows, error: gymError } = await supabase
        .from('gyms')
        .select('id, name, city, logo_url, cover_image_url, rating, review_count, tags, latitude, longitude, is_verified')
        .eq('is_active', true)
        .order('rating', { ascending: false })
      if (gymError) throw gymError

      const gymIds = (gymRows ?? []).map((g) => g.id)
      let priceMap = new Map<string, number>()
      if (gymIds.length > 0) {
        const { data: planRows, error: planError } = await supabase
          .from('membership_plans')
          .select('gym_id, price_naira')
          .eq('is_active', true)
          .in('gym_id', gymIds)
        if (planError) throw planError
        priceMap = (planRows ?? []).reduce((map, p) => {
          const current = map.get(p.gym_id)
          if (current === undefined || p.price_naira < current) map.set(p.gym_id, p.price_naira)
          return map
        }, new Map<string, number>())
      }

      setGyms((gymRows ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        city: g.city,
        logoUrl: g.logo_url,
        coverImageUrl: g.cover_image_url,
        rating: g.rating ?? 0,
        reviewCount: g.review_count ?? 0,
        tags: g.tags ?? [],
        isVerified: g.is_verified ?? false,
        latitude: g.latitude,
        longitude: g.longitude,
        startingPrice: priceMap.get(g.id) ?? null,
        distanceMetres: null,
      })))
    } catch (err) {
      logger.error('discover', 'fetchGyms', err)
    }
  }, [])

  const loadTrainers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('trainer_profiles')
        .select('id, display_name, photo_url, city, years_experience, avg_rating, review_count, specializations, service_types, is_independent, trainer_pricing(amount_naira, is_active), trainer_gym_affiliations(gyms(name))')
        .eq('status', 'approved')
        .eq('availability_paused', false)
        .order('avg_rating', { ascending: false })
      if (error) throw error

      setTrainers((data ?? []).map((t) => {
        const pricing = (t.trainer_pricing as unknown as { amount_naira: number; is_active: boolean }[] | null) ?? []
        const activePrices = pricing.filter((p) => p.is_active).map((p) => p.amount_naira)
        const affiliations = (t.trainer_gym_affiliations as unknown as { gyms: { name: string } | null }[] | null) ?? []
        return {
          id: t.id,
          displayName: t.display_name,
          photoUrl: t.photo_url,
          city: t.city,
          yearsExperience: t.years_experience,
          avgRating: t.avg_rating ?? 0,
          reviewCount: t.review_count ?? 0,
          specializations: t.specializations ?? [],
          serviceTypes: (t.service_types as ServiceType[]) ?? [],
          isIndependent: t.is_independent ?? false,
          startingPrice: activePrices.length > 0 ? Math.min(...activePrices) : null,
          gymNames: affiliations.map((a) => a.gyms?.name).filter((n): n is string => !!n),
        }
      }))
    } catch (err) {
      logger.error('discover', 'fetchTrainers', err)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    setLoading(true)
    Promise.all([loadGyms(), loadTrainers()]).finally(() => setLoading(false))
  }, [loadGyms, loadTrainers]))

  function toggleGymSort(key: GymSort) {
    setGymSorts((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  async function handleNearby() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (userCoords) {
      toggleGymSort('nearby')
      return
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setLocationDenied(true)
        return
      }
      const pos = await Location.getCurrentPositionAsync({})
      setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
      setGymSorts((prev) => { const n = new Set(prev); n.add('nearby'); return n })
    } catch (err) {
      logger.error('discover', 'fetchLocation', err)
      setLocationDenied(true)
    }
  }

  async function handleNearMeTrainer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (nearMeActive) {
      setNearMeActive(false)
      if (cityFilter === nearMeCity) setCityFilter('')
      return
    }
    try {
      let coords = userCoords
      if (!coords) {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') { setLocationDeniedTrainer(true); return }
        const pos = await Location.getCurrentPositionAsync({})
        coords = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setUserCoords(coords)
      }
      const [place] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lon })
      const city = place?.city ?? place?.subregion ?? place?.region ?? null
      if (city) {
        setNearMeCity(city)
        setCityFilter(city)
        setNearMeActive(true)
        setLocationDeniedTrainer(false)
      }
    } catch (err) {
      logger.error('discover', 'nearMeTrainer', err)
      setLocationDeniedTrainer(true)
    }
  }

  const availableTags = useMemo(() => {
    const set = new Set<string>()
    gyms.forEach((g) => g.tags.forEach((t) => set.add(t)))
    return Array.from(set)
  }, [gyms])

  const filteredGyms = useMemo(() => {
    let list = gyms.map((g) => ({
      ...g,
      distanceMetres: userCoords && g.latitude != null && g.longitude != null
        ? getDistanceMetres(userCoords.lat, userCoords.lon, g.latitude, g.longitude)
        : g.distanceMetres,
    })).filter((g) => {
      if (search) {
        const q = search.toLowerCase()
        if (!g.name.toLowerCase().includes(q) && !g.city.toLowerCase().includes(q)) return false
      }
      if (selectedTags.size > 0 && !g.tags.some((t) => selectedTags.has(t))) return false
      if (g.startingPrice != null) {
        if (minPriceNaira > MIN_PRICE && g.startingPrice < minPriceNaira) return false
        if (maxPriceNaira < MAX_PRICE && g.startingPrice > maxPriceNaira) return false
      }
      if (userCoords && maxDistKm < MAX_DIST) {
        const km = (g.distanceMetres ?? Infinity) / 1000
        if (km > maxDistKm) return false
      }
      return true
    })

    // Apply sorts in priority: nearby > top_rated > price_asc (all can be active)
    list = [...list].sort((a, b) => {
      if (gymSorts.has('nearby') && userCoords) {
        const da = a.distanceMetres ?? Infinity
        const db = b.distanceMetres ?? Infinity
        if (da !== db) return da - db
      }
      if (gymSorts.has('top_rated')) {
        if (b.rating !== a.rating) return b.rating - a.rating
      }
      if (gymSorts.has('price_asc')) {
        const pa = a.startingPrice ?? Infinity
        const pb = b.startingPrice ?? Infinity
        if (pa !== pb) return pa - pb
      }
      return 0
    })

    return list
  }, [gyms, search, selectedTags, gymSorts, userCoords, minPriceNaira, maxPriceNaira, maxDistKm])

  const filteredTrainers = useMemo(() => {
    return trainers.filter((t) => {
      if (search) {
        const q = search.toLowerCase()
        const matchesName = t.displayName.toLowerCase().includes(q)
        const matchesSpec = t.specializations.some((s) => s.toLowerCase().includes(q))
        if (!matchesName && !matchesSpec) return false
      }
      if (cityFilter && (!t.city || !t.city.toLowerCase().includes(cityFilter.toLowerCase()))) return false
      if (serviceFilters.size > 0 && !t.serviceTypes.some((s) => serviceFilters.has(s))) return false
      if (specFilters.size > 0 && !t.specializations.some((s) => specFilters.has(s))) return false
      return true
    })
  }, [trainers, search, cityFilter, serviceFilters, specFilters])

  const priceActive = minPriceNaira > MIN_PRICE || maxPriceNaira < MAX_PRICE
  const distActive = maxDistKm < MAX_DIST
  const gymFilterCount = gymSorts.size + selectedTags.size + (priceActive ? 1 : 0) + (distActive ? 1 : 0)
  const trainerFilterCount = (cityFilter ? 1 : 0) + serviceFilters.size + specFilters.size
  const filterCount = segment === 'gyms' ? gymFilterCount : trainerFilterCount

  function resetGymFilters() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setGymSorts(new Set())
    setSelectedTags(new Set())
    setMinPriceNaira(MIN_PRICE)
    setMaxPriceNaira(MAX_PRICE)
    setMaxDistKm(MAX_DIST)
  }

  function resetTrainerFilters() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setCityFilter('')
    setNearMeActive(false)
    setServiceFilters(new Set())
    setSpecFilters(new Set())
  }

  const sLabel: object = { fontFamily: 'DMSans_500Medium', fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.38)', marginBottom: 0 }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 44, paddingBottom: 4, backgroundColor: c.bg }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 28, letterSpacing: -0.56, color: c.text, marginBottom: 16 }}>
          Discover
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <View style={{
            flex: 1, flexDirection: 'row', alignItems: 'center',
            backgroundColor: c.surface, borderRadius: 999,
            borderWidth: 1.5, borderColor: c.border,
            paddingHorizontal: 14, height: 46,
          }}>
            <Search size={15} color={c.textFaint} strokeWidth={1.75} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={segment === 'gyms' ? 'Search gyms, areas...' : 'Search trainers, specialties...'}
              placeholderTextColor={c.textFaint}
              style={{ flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: c.text, marginLeft: 8 }}
            />
          </View>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowFilters(true) }}
            style={({ pressed }) => [styles.filterIconButton, { opacity: pressed ? 0.72 : 1 }]}
          >
            <View style={[styles.filterIconVisual, {
              backgroundColor: filterCount > 0 ? `${c.green}20` : c.surface,
              borderColor: filterCount > 0 ? c.green : c.border,
            }]}>
              <SlidersHorizontal size={17} color={filterCount > 0 ? c.greenDeep : c.textMuted} strokeWidth={2} />
              {filterCount > 0 && (
                <View style={{
                  position: 'absolute', top: -5, right: -5,
                  minWidth: 18, height: 18, borderRadius: 9,
                  backgroundColor: c.green,
                  alignItems: 'center', justifyContent: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 2, borderColor: c.bg,
                }}>
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 10, color: c.obsidian, lineHeight: 13 }}>{filterCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>

        <View style={{
          flexDirection: 'row',
          backgroundColor: c.stone2,
          borderRadius: 999,
          padding: 4,
          gap: 2,
          marginBottom: 14,
        }}>
          {(['gyms', 'trainers'] as Segment[]).map((seg) => {
            const active = segment === seg
            return (
              <Pressable
                key={seg}
                onPress={() => { setSegment(seg); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
                style={{
                  flex: 1, alignItems: 'center',
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: active ? c.surface : 'transparent',
                  shadowColor: active ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: active ? 0.08 : 0,
                  shadowRadius: 3,
                  elevation: active ? 2 : 0,
                }}
              >
                <Text style={{
                  fontFamily: 'DMSans_500Medium', fontSize: 14,
                  color: active ? c.text : c.textMuted,
                  textTransform: 'capitalize',
                }}>
                  {seg}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {segment === 'gyms' ? (
          <ScrollView horizontal style={{ flexGrow: 0, height: 46 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
            {[
              { key: 'nearby' as const, label: 'Nearby', Icon: MapPin, onPress: handleNearby },
              { key: 'top_rated' as const, label: 'Top Rated', Icon: TrendingUp, onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleGymSort('top_rated') } },
              { key: 'price_asc' as const, label: 'Lowest Price', Icon: Banknote, onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleGymSort('price_asc') } },
            ].map(({ key, label, Icon, onPress }) => {
              const on = gymSorts.has(key)
              return (
                <Pressable
                  key={key}
                  onPress={onPress}
                  style={({ pressed }) => [styles.filterChipPressable, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[styles.filterChipVisual, { borderColor: on ? c.green : c.stone, backgroundColor: on ? `${c.green}1C` : c.surface }]}>
                    <Icon size={13} color={on ? c.greenDeep : c.textMuted} strokeWidth={2} style={{ marginRight: 6 }} />
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: on ? c.greenDeep : c.textMuted }}>
                      {label}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFilters(true) }}
              style={({ pressed }) => [styles.filterChipPressable, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.filterChipVisual, { borderColor: selectedTags.size > 0 ? c.green : c.stone, backgroundColor: selectedTags.size > 0 ? `${c.green}20` : c.surface }]}>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: selectedTags.size > 0 ? c.greenDeep : c.textMuted }}>
                  {selectedTags.size > 0 ? `${selectedTags.size} categor${selectedTags.size > 1 ? 'ies' : 'y'}` : 'Categories'}
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView horizontal style={{ flexGrow: 0, height: 46 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
            {/* Near Me — first pill */}
            <Pressable
              onPress={handleNearMeTrainer}
              style={({ pressed }) => [styles.filterChipPressable, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.filterChipVisual, { borderColor: nearMeActive ? c.green : c.stone, backgroundColor: nearMeActive ? `${c.green}1C` : c.surface }]}>
                <MapPin size={13} color={nearMeActive ? c.greenDeep : c.textMuted} strokeWidth={2} style={{ marginRight: 6 }} />
                <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: nearMeActive ? c.greenDeep : c.textMuted }}>
                  {nearMeActive && nearMeCity ? nearMeCity : 'Near Me'}
                </Text>
              </View>
            </Pressable>

            {SERVICE_FILTERS.map((f) => {
              const on = serviceFilters.has(f.key)
              return (
                <Pressable
                  key={f.key}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setServiceFilters((prev) => {
                      const next = new Set(prev)
                      on ? next.delete(f.key) : next.add(f.key)
                      return next
                    })
                  }}
                  style={({ pressed }) => [styles.filterChipPressable, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[styles.filterChipVisual, { borderColor: on ? c.green : c.stone, backgroundColor: on ? `${c.green}1C` : c.surface }]}>
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: on ? c.greenDeep : c.textMuted }}>{f.label}</Text>
                  </View>
                </Pressable>
              )
            })}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowFilters(true) }}
              style={({ pressed }) => [styles.filterChipPressable, { opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.filterChipVisual, { borderColor: specFilters.size > 0 ? c.green : c.stone, backgroundColor: specFilters.size > 0 ? `${c.green}20` : c.surface }]}>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: specFilters.size > 0 ? c.greenDeep : c.textMuted }}>
                  {specFilters.size > 0 ? `${specFilters.size} spec${specFilters.size > 1 ? 's' : ''}` : 'Specialization'}
                </Text>
              </View>
            </Pressable>
          </ScrollView>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.green} />
        </View>
      ) : segment === 'gyms' ? (
        <>
          {gymFilterCount > 0 || search ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: c.textMuted, paddingHorizontal: 20, marginBottom: 10 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', color: c.text }}>{filteredGyms.length}</Text>
              {filteredGyms.length === 1 ? ' gym' : ' gyms'} found
            </Text>
          ) : null}
        <FlatList
          data={filteredGyms}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListEmptyComponent={
            <View style={{ paddingVertical: 64, alignItems: 'center' }}>
              <Dumbbell size={36} color={c.stone} strokeWidth={1.5} />
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: c.text, marginTop: 18, marginBottom: 8, letterSpacing: -0.36 }}>
                No gyms found
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 21 }}>
                Try adjusting your filters or search.
              </Text>
              <Pressable
                onPress={() => router.push('/(member)/request-gym' as any)}
                style={({ pressed }) => ({ marginTop: 18, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: c.green, opacity: pressed ? 0.8 : 1 })}
              >
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: '#07120D' }}>Request this gym</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <GymCard
              id={item.id}
              name={item.name}
              coverImageUrl={item.coverImageUrl}
              logoUrl={item.logoUrl}
              rating={item.rating}
              reviewCount={item.reviewCount}
              distanceLabel={item.distanceMetres != null ? formatDistance(item.distanceMetres) : undefined}
              startingPriceNaira={item.startingPrice}
              tags={item.tags}
              isVerified={item.isVerified}
              onPress={() => router.push({ pathname: '/(member)/gym/[id]', params: { id: item.id } })}
            />
          )}
        />
        </>
      ) : (
        <>
          {trainerFilterCount > 0 || search ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: c.textMuted, paddingHorizontal: 20, marginBottom: 10 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', color: c.text }}>{filteredTrainers.length}</Text>
              {filteredTrainers.length === 1 ? ' trainer' : ' trainers'} found
            </Text>
          ) : null}
        <FlatList
          data={filteredTrainers}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={{ paddingVertical: 64, alignItems: 'center' }}>
              <Users size={36} color={c.stone} strokeWidth={1.5} />
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: c.text, marginTop: 18, marginBottom: 8, letterSpacing: -0.36 }}>
                No trainers found
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 21 }}>
                Try adjusting your search or filters.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TrainerCard
              id={item.id}
              displayName={item.displayName}
              photoUrl={item.photoUrl}
              rating={item.avgRating}
              reviewCount={item.reviewCount}
              yearsExperience={item.yearsExperience}
              primarySpecialization={item.specializations[0] ?? null}
              startingPriceNaira={item.startingPrice}
              gymNames={item.gymNames}
              isIndependent={item.isIndependent}
              onPress={() => router.push({ pathname: '/(member)/trainers/[id]', params: { id: item.id } })}
            />
          )}
        />
        </>
      )}

      <Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}
            onPress={() => setShowFilters(false)}
          />
          <View style={{ backgroundColor: '#131313', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' }}>
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 }}>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, letterSpacing: -0.44, color: '#F5F5F0' }}>Filters</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {filterCount > 0 && (
                  <Pressable
                    onPress={segment === 'gyms' ? resetGymFilters : resetTrainerFilters}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <View style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', alignItems: 'center' }}>
                      <RotateCcw size={11} color="rgba(255,255,255,0.5)" strokeWidth={2} style={{ marginRight: 5 }} />
                      <Text maxFontSizeMultiplier={1.1} style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Reset</Text>
                    </View>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setShowFilters(false)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={15} color="rgba(255,255,255,0.55)" strokeWidth={2.2} />
                  </View>
                </Pressable>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
              {segment === 'gyms' ? (
                <>
                  {locationDenied && (
                    <View style={{ backgroundColor: 'rgba(255,112,67,0.12)', borderRadius: 10, padding: 12, marginBottom: 20 }}>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#FF7043', lineHeight: 18 }}>
                        Location permission denied. Enable it in Settings to use Nearest first.
                      </Text>
                    </View>
                  )}

                  {/* ── Sort ── */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28 }}>
                    {([
                      { key: 'nearby' as GymSort, label: 'Nearest' },
                      { key: 'top_rated' as GymSort, label: 'Top Rated' },
                      { key: 'price_asc' as GymSort, label: 'Price ↑' },
                    ] as { key: GymSort; label: string }[]).map(({ key, label }) => {
                      const on = gymSorts.has(key)
                      return (
                        <Pressable
                          key={key}
                          onPress={async () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            if (key === 'nearby') await handleNearby()
                            else toggleGymSort(key)
                          }}
                          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.72 : 1 })}
                        >
                          <View style={[styles.sheetOptionVisual, {
                            borderColor: on ? '#00E87A' : 'rgba(255,255,255,0.12)',
                            backgroundColor: on ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.04)',
                          }]}>
                            <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: on ? '#00E87A' : 'rgba(255,255,255,0.6)' }}>{label}</Text>
                          </View>
                        </Pressable>
                      )
                    })}
                  </View>

                  {/* ── Price range ── */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <Text style={sLabel}>Price Range</Text>
                    <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 13, color: priceActive ? '#00E87A' : 'rgba(255,255,255,0.35)', letterSpacing: -0.2 }}>
                      {priceActive
                        ? `₦${(minPriceNaira / 1000).toFixed(0)}k – ₦${maxPriceNaira >= MAX_PRICE ? 'Any' : (maxPriceNaira / 1000).toFixed(0) + 'k'}`
                        : 'Any'}
                    </Text>
                  </View>
                  <RangeSlider
                    low={minPriceNaira}
                    high={maxPriceNaira}
                    min={MIN_PRICE}
                    max={MAX_PRICE}
                    onChangeLow={setMinPriceNaira}
                    onChangeHigh={setMaxPriceNaira}
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 28 }}>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>₦0</Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>₦200k+</Text>
                  </View>

                  {/* ── Distance ── */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <Text style={sLabel}>Distance</Text>
                    <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 13, color: distActive ? '#00E87A' : 'rgba(255,255,255,0.35)', letterSpacing: -0.2 }}>
                      {distActive ? `≤ ${maxDistKm} km` : 'Any'}
                    </Text>
                  </View>
                  <SingleSlider value={maxDistKm} min={1} max={MAX_DIST} onChange={setMaxDistKm} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 28 }}>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>1 km</Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>50 km</Text>
                  </View>

                  {/* ── Category ── */}
                  <Text style={[sLabel, { marginBottom: 12 }]}>Category</Text>
                  {availableTags.length === 0 ? (
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 28 }}>No categories yet.</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
                      {availableTags.map((tag) => {
                        const on = selectedTags.has(tag)
                        return (
                          <Pressable
                            key={tag}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                              setSelectedTags((prev) => { const n = new Set(prev); on ? n.delete(tag) : n.add(tag); return n })
                            }}
                            style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
                          >
                            <View style={[styles.sheetPillVisual, {
                              borderColor: on ? '#00E87A' : 'rgba(255,255,255,0.15)',
                              backgroundColor: on ? 'rgba(0,232,122,0.14)' : 'rgba(255,255,255,0.05)',
                            }]}>
                              <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: on ? '#00E87A' : 'rgba(255,255,255,0.7)' }}>{tag}</Text>
                            </View>
                          </Pressable>
                        )
                      })}
                    </View>
                  )}
                </>
              ) : (
                <>
                  {locationDeniedTrainer && (
                    <View style={{ backgroundColor: 'rgba(255,112,67,0.12)', borderRadius: 10, padding: 12, marginBottom: 20 }}>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#FF7043', lineHeight: 18 }}>
                        Location permission denied. Enable it in Settings to use Near Me.
                      </Text>
                    </View>
                  )}

                  {/* ── Location ── */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={sLabel}>Location</Text>
                    {nearMeActive && nearMeCity && (
                      <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: '#00E87A', letterSpacing: -0.2 }}>
                        Near {nearMeCity}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28, width: '100%' }}>
                    <Pressable
                      onPress={handleNearMeTrainer}
                      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.72 : 1 })}
                    >
                      <View style={[styles.sheetOptionVisual, {
                        flexDirection: 'row',
                        borderColor: nearMeActive ? '#00E87A' : 'rgba(255,255,255,0.12)',
                        backgroundColor: nearMeActive ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.04)',
                      }]}>
                        <MapPin size={13} color={nearMeActive ? '#00E87A' : 'rgba(255,255,255,0.5)'} strokeWidth={2} style={{ marginRight: 6 }} />
                        <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: nearMeActive ? '#00E87A' : 'rgba(255,255,255,0.6)' }}>Near Me</Text>
                      </View>
                    </Pressable>
                  <View style={{
                    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
                    borderWidth: 1.5, borderColor: nearMeActive ? 'rgba(0,232,122,0.25)' : 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 12, minHeight: 48,
                  }}>
                      <MapPin size={14} color={nearMeActive ? '#00E87A' : 'rgba(255,255,255,0.35)'} strokeWidth={1.75} />
                    <TextInput
                      value={cityFilter}
                      onChangeText={(v) => { setCityFilter(v); if (nearMeActive) setNearMeActive(false) }}
                      placeholder="Type a city..."
                      placeholderTextColor="rgba(255,255,255,0.28)"
                      style={{ flex: 1, minWidth: 0, fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#F5F5F0', marginLeft: 8 }}
                    />
                    {cityFilter.length > 0 && (
                      <Pressable onPress={() => { setCityFilter(''); setNearMeActive(false) }}>
                        <X size={14} color="rgba(255,255,255,0.4)" strokeWidth={2} />
                      </Pressable>
                    )}
                  </View>
                  </View>

                  {/* ── Service type ── */}
                  <Text style={[sLabel, { marginBottom: 12 }]}>Service Type</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 28 }}>
                    {SERVICE_FILTERS.map((f) => {
                      const on = serviceFilters.has(f.key)
                      return (
                        <Pressable
                          key={f.key}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            setServiceFilters((prev) => { const n = new Set(prev); on ? n.delete(f.key) : n.add(f.key); return n })
                          }}
                          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.72 : 1 })}
                        >
                          <View style={[styles.sheetOptionVisual, {
                            borderColor: on ? '#00E87A' : 'rgba(255,255,255,0.12)',
                            backgroundColor: on ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.04)',
                          }]}>
                            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} maxFontSizeMultiplier={1.1} style={{ flexShrink: 1, fontFamily: 'DMSans_500Medium', fontSize: 12, color: on ? '#00E87A' : 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{f.label}</Text>
                          </View>
                        </Pressable>
                      )
                    })}
                  </View>

                  {/* ── Specialization ── */}
                  <Text style={[sLabel, { marginBottom: 12 }]}>Specialization</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
                    {TRAINER_SPECIALIZATIONS.map((s) => {
                      const on = specFilters.has(s)
                      return (
                        <Pressable
                          key={s}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            setSpecFilters((prev) => { const n = new Set(prev); on ? n.delete(s) : n.add(s); return n })
                          }}
                          style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
                        >
                          <View style={[styles.sheetPillVisual, {
                            borderColor: on ? '#00E87A' : 'rgba(255,255,255,0.15)',
                            backgroundColor: on ? 'rgba(0,232,122,0.14)' : 'rgba(255,255,255,0.05)',
                          }]}>
                            <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: on ? '#00E87A' : 'rgba(255,255,255,0.7)' }}>{s}</Text>
                          </View>
                        </Pressable>
                      )
                    })}
                  </View>
                </>
              )}

              {/* ── CTA ── */}
              <Pressable
                onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setShowFilters(false) }}
                style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.78 : 1 })}
              >
                <View style={[styles.sheetCtaVisual, { backgroundColor: '#00E87A' }]}>
                  <Text numberOfLines={1} maxFontSizeMultiplier={1.1} style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: '#0A0A0A', letterSpacing: -0.3 }}>
                    Show {segment === 'gyms' ? filteredGyms.length : filteredTrainers.length}{' '}
                    {segment === 'gyms' ? 'gym' : 'trainer'}{(segment === 'gyms' ? filteredGyms.length : filteredTrainers.length) !== 1 ? 's' : ''}
                  </Text>
                </View>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}
