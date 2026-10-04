import React, { useState } from 'react'
import { View, Text, ScrollView, Pressable } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ArrowLeft, MapPin, Star, ShieldCheck, Heart, Dumbbell } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'

const SAVED_GYMS = [
  {
    id: 'kinetic',
    name: 'Kinetic Studio',
    city: 'Ikoyi, Lagos',
    distance: 3.4,
    priceFrom: 28000,
    rating: 4.9,
    verified: true,
    equipment: ['Yoga Mat Area', 'Reformer', 'Resistance Bands'],
  },
  {
    id: 'pulse',
    name: 'Pulse Fitness',
    city: 'Maitama, Abuja',
    distance: 12,
    priceFrom: 30000,
    rating: 4.7,
    verified: true,
    equipment: ['Treadmill', 'Spin Bike', 'Dumbbells'],
  },
  {
    id: 'apex',
    name: 'Apex Performance',
    city: 'VI, Lagos',
    distance: 5.1,
    priceFrom: 18000,
    rating: 4.5,
    verified: false,
    equipment: ['Free Weights', 'Cardio Zone', 'Battle Ropes'],
  },
]

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

function GymCard({ gym, onUnsave }: { gym: typeof SAVED_GYMS[0]; onUnsave: () => void }) {
  const colors = useColors()
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        router.push({ pathname: '/(member)/gym/[id]', params: { id: gym.id } })
      }}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 12,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {/* Top row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
        {/* Gym icon */}
        <View style={{
          width: 44, height: 44, borderRadius: 14,
          backgroundColor: colors.stone2,
          alignItems: 'center', justifyContent: 'center',
          marginRight: 12,
        }}>
          <Dumbbell size={20} color={colors.textMuted} strokeWidth={1.75} />
        </View>

        {/* Name + location */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: colors.text }}>
              {gym.name}
            </Text>
            {gym.verified && (
              <ShieldCheck size={13} color={colors.green} strokeWidth={2} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} color={colors.textFaint} strokeWidth={2} />
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>
              {gym.city} · {gym.distance} km
            </Text>
          </View>
        </View>

        {/* Unsave heart */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onUnsave()
          }}
          hitSlop={12}
          style={{ padding: 4 }}
        >
          <Heart size={18} color={colors.ember} strokeWidth={2} fill={colors.ember} />
        </Pressable>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 10 }} />

      {/* Bottom row: rating + price */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Star size={12} color={colors.amber} strokeWidth={2} fill={colors.amber} />
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.text }}>
            {gym.rating}
          </Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginLeft: 8 }}>
            {gym.equipment.slice(0, 2).join(' · ')}
          </Text>
        </View>
        <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 13, color: colors.text }}>
          from {formatPrice(gym.priceFrom)}/mo
        </Text>
      </View>
    </Pressable>
  )
}

export default function SavedGymsScreen() {
  const colors = useColors()
  const [saved, setSaved] = useState(SAVED_GYMS)

  function unsave(id: string) {
    setSaved(prev => prev.filter(g => g.id !== id))
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        paddingTop: 60, paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderBottomWidth: 1, borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }}>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back() }}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: colors.stone2,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <ArrowLeft size={18} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, letterSpacing: -0.4, color: colors.text }}>
          Saved gyms
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {saved.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 64 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 20,
              backgroundColor: colors.stone2,
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <Heart size={28} color={colors.textMuted} strokeWidth={1.75} />
            </View>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, letterSpacing: -0.4, color: colors.text, marginBottom: 8 }}>
              No saved gyms
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
              Tap the heart on any gym to save it here for later.
            </Text>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(member)/discover') }}
              style={({ pressed }) => ({
                marginTop: 28, height: 48, paddingHorizontal: 24,
                borderRadius: 12, backgroundColor: colors.obsidian,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.chalk }}>
                Browse gyms
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: 14 }}>
              {saved.length} saved {saved.length === 1 ? 'gym' : 'gyms'}
            </Text>
            {saved.map(gym => (
              <GymCard key={gym.id} gym={gym} onUnsave={() => unsave(gym.id)} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  )
}
