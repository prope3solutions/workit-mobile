import React, { useRef, useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, Animated, PanResponder, Dimensions, TextInput, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Dumbbell, CalendarCheck, ChevronRight, Bell, Check, Trash2, Timer, CalendarDays, Clock, Flame, Zap, Plus } from 'lucide-react-native'
import Svg, { Circle } from 'react-native-svg'
import { useAuthStore } from '@/lib/stores/authStore'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'
import { useSessionStore } from '@/lib/stores/sessionStore'
import { useMembership } from '@/lib/hooks/useMembership'
import { useNearbyGymPrompt } from '@/lib/hooks/useNearbyGymPrompt'
import { useCheckIns } from '@/lib/hooks/useCheckIns'
import { useWorkoutPlan } from '@/lib/hooks/useWorkoutPlan'
import { formatDateLong } from '@/lib/utils/formatDate'
import { CheckInOverlay } from '@/components/shared/CheckInOverlay'
import { JoinGymSheet } from '@/components/shared/JoinGymSheet'

const MEMBERSHIP_BG = require('../../screens/dumbell.jpg')
const WORKIT_LOGO = require('../../assets/workit.png')

const SCREEN_W = Dimensions.get('window').width
const TYPING_SPEED = 55

function getTimeSlot(h: number): string {
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  return 'evening'
}

function useTypingAnimation(fullText: string, storageKey: string) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const slot = getTimeSlot(new Date().getHours())
      const key = `${storageKey}_${slot}`
      const seen = await AsyncStorage.getItem(key)
      if (seen) {
        setDisplayed(fullText)
        setDone(true)
        return
      }
      await AsyncStorage.setItem(key, '1')
      let i = 0
      function tick() {
        if (cancelled) return
        i++
        setDisplayed(fullText.slice(0, i))
        if (i < fullText.length) setTimeout(tick, TYPING_SPEED)
        else setDone(true)
      }
      setTimeout(tick, 300)
    }
    run()
    return () => { cancelled = true }
  }, [fullText])

  return { displayed, done }
}

function formatPrice(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

const MOCK_MEMBERSHIP = {
  gymName: 'Forge Gym',
  gymId: 'forge',
  memberCode: 'FRG-7X4K-2026',
  plan: 'Monthly',
  expires: 'Jul 6, 2026',
  daysLeft: 29,
  planDays: 30,
  checkinsThisMonth: 29,
  checkinsGoal: 30,
  nextRenewal: formatPrice(35000),
  streak: 4,
  streakGoal: 7,
  todayPlan: [
    {
      id: '1', name: 'Squat Rack', sets: '5×5', duration: '45 min', calories: 280,
      trainingArea: 'Lower A' as const,
    },
    {
      id: '2', name: 'Bench Press', sets: '4×8', duration: '30 min', calories: 180,
      trainingArea: 'Upper A' as const,
    },
    {
      id: '3', name: 'Pull-ups', sets: '3×max', duration: '20 min', calories: 120,
      trainingArea: 'Upper B' as const,
    },
  ],
}

// ── Progress stat (icon badge with a filling ring) ────────────────────────────
const RING_SIZE = 50
const RING_STROKE = 3.5
const RING_R = (RING_SIZE - RING_STROKE) / 2
const RING_C = 2 * Math.PI * RING_R

type StatKind = 'flame' | 'calendar' | 'clock'

// Idle motion loop per icon kind, plus a one-shot flare when the count increases.
function AnimatedStatIcon({ kind, Icon, size, color, flare }: {
  kind: StatKind
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>
  size: number; color: string; flare: Animated.Value
}) {
  const loop = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const cfg =
      kind === 'flame' ? { dur: 620 } :
      kind === 'calendar' ? { dur: 1400 } :
      { dur: 2000 }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(loop, { toValue: 1, duration: cfg.dur, useNativeDriver: native }),
        Animated.timing(loop, { toValue: 0, duration: cfg.dur, useNativeDriver: native }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [kind])

  // Idle transforms — distinct per icon
  let idleStyle: any = {}
  if (kind === 'flame') {
    idleStyle = {
      transform: [
        { scale: loop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) },
        { translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [0.6, -0.6] }) },
      ],
    }
  } else if (kind === 'calendar') {
    idleStyle = {
      transform: [{ translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [0.8, -0.8] }) }],
    }
  } else {
    idleStyle = {
      transform: [{ rotate: loop.interpolate({ inputRange: [0, 1], outputRange: ['-6deg', '6deg'] }) }],
    }
  }

  // Flare — a bigger pop layered on top when the value increases
  const flareStyle = {
    transform: [{ scale: flare.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
  }

  return (
    <Animated.View style={flareStyle}>
      <Animated.View style={idleStyle}>
        <Icon size={size} color={color} strokeWidth={2.2} />
      </Animated.View>
    </Animated.View>
  )
}

function ProgressStat({ kind, Icon, iconColor, progress, count, unit, valueColor, label, sub, countdown, onSave }: {
  kind: StatKind
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>
  iconColor: string; progress: number; count: number; unit?: string
  valueColor?: string; label: string; sub: string
  countdown: string
  onSave: (n: number) => void
}) {
  const colors = useColors()
  const clamped = Math.max(0, Math.min(1, progress))

  const flip = useRef(new Animated.Value(0)).current
  const [flipped, setFlipped] = useState(false)
  const ringAnim = useRef(new Animated.Value(RING_C)).current
  const [ringDashoffset, setRingDashoffset] = useState(RING_C)
  const flare = useRef(new Animated.Value(0)).current
  const prevCount = useRef(count)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(count))

  // Animate ring fill on mount / progress change via a plain listener —
  // avoids Animated.createAnimatedComponent(Circle), which triggers a
  // "Received `false` for non-boolean attribute `collapsable`" crash on
  // some Android/Expo Go builds because SVG nodes aren't real RN views.
  useEffect(() => {
    const id = ringAnim.addListener(({ value }) => setRingDashoffset(value))
    return () => ringAnim.removeListener(id)
  }, [])

  useEffect(() => {
    Animated.timing(ringAnim, { toValue: RING_C * (1 - clamped), duration: 800, useNativeDriver: false }).start()
  }, [clamped])

  // Flare the icon whenever the count goes up
  useEffect(() => {
    if (count > prevCount.current) {
      flare.setValue(0)
      Animated.sequence([
        Animated.spring(flare, { toValue: 1, useNativeDriver: native, speed: 20, bounciness: 14 }),
        Animated.timing(flare, { toValue: 0, duration: 260, useNativeDriver: native }),
      ]).start()
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    prevCount.current = count
  }, [count])

  function doFlip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const to = flipped ? 0 : 1
    Animated.spring(flip, { toValue: to, useNativeDriver: native, speed: 13, bounciness: 5 }).start()
    if (flipped) { setEditing(false) }
    else { setDraft(String(count)) }
    setFlipped(f => !f)
  }

  function save() {
    const n = parseInt(draft, 10)
    if (!isNaN(n) && n >= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onSave(n)
    }
    setEditing(false)
    doFlip()
  }

  const frontRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const backRot  = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })
  const frontOp  = flip.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [1, 1, 0, 0] })
  const backOp   = flip.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [0, 0, 1, 1] })

  return (
    <Pressable style={{ flex: 1, minHeight: 128 }} onPress={doFlip}>
      {/* FRONT */}
      <Animated.View style={{
        position: 'absolute', width: '100%', alignItems: 'center',
        opacity: frontOp, backfaceVisibility: 'hidden',
        transform: [{ perspective: 800 }, { rotateY: frontRot }],
      }}>
        <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} stroke={`${iconColor}22`} strokeWidth={RING_STROKE} fill="none" />
            <Circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R}
              stroke={iconColor} strokeWidth={RING_STROKE} fill="none"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={ringDashoffset}
            />
          </Svg>
          <View style={{
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: iconColor,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <AnimatedStatIcon kind={kind} Icon={Icon} size={16} color={colors.white} flare={flare} />
          </View>
        </View>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, letterSpacing: -0.44, color: valueColor ?? colors.text, marginBottom: 2 }}>
          {count}{unit ?? ''}
        </Text>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.text }}>{label}</Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint, marginTop: 1 }}>{sub}</Text>
      </Animated.View>

      {/* BACK */}
      <Animated.View style={{
        position: 'absolute', width: '100%', alignItems: 'center',
        opacity: backOp, backfaceVisibility: 'hidden',
        transform: [{ perspective: 800 }, { rotateY: backRot }],
      }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 30, letterSpacing: -0.6, color: valueColor ?? colors.text, marginBottom: 2 }}>
          {count}{unit ?? ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, maxWidth: '100%' }}>
          <Timer size={10} color={colors.textFaint} strokeWidth={2} />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontFamily: 'DMMono_400Regular', fontSize: 10, color: colors.textFaint, flexShrink: 1 }}
          >
            {countdown}
          </Text>
        </View>

        {editing ? (
          <View style={{ alignItems: 'center', gap: 6, width: '100%' }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
              style={{
                width: 72, height: 44, borderRadius: 11,
                borderWidth: 1, borderColor: iconColor,
                backgroundColor: colors.bg,
                textAlign: 'center',
                fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.text,
              }}
            />
            <Pressable
              onPress={save}
              hitSlop={8}
              style={({ pressed }) => ({
                paddingHorizontal: 16, height: 28, borderRadius: 999,
                backgroundColor: iconColor, alignItems: 'center', justifyContent: 'center',
                transform: [{ scale: pressed ? 0.95 : 1 }],
              })}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.white }}>Save</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEditing(true) }}
            hitSlop={8}
            style={({ pressed }) => ({
              paddingHorizontal: 14, height: 28, borderRadius: 999,
              borderWidth: 1, borderColor: `${iconColor}55`,
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: iconColor }}>Reset</Text>
          </Pressable>
        )}
      </Animated.View>
    </Pressable>
  )
}

// ── Swipeable plan row ────────────────────────────────────────────────────────
const SWIPE_ACTIVATE = 56
const SWIPE_CONFIRM  = 116

type PlanItem = {
  id: string; name: string; sets: string; duration: string
  image?: any; calories?: number; trainingArea?: 'Upper A' | 'Lower A' | 'Upper B' | 'Lower B'
}

function toTodayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function SwipeableRow({ item, initialDone, onDone, onDelete }: {
  item: PlanItem; initialDone?: boolean; onDone: () => void; onDelete: () => void
}) {
  const colors = useColors()
  const tx = useRef(new Animated.Value(0)).current
  const [done, setDone] = useState(initialDone ?? false)
  const hapticFired = useRef<'none' | 'activate' | 'confirm'>('none')

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,

      onPanResponderGrant: () => {
        hapticFired.current = 'none'
        tx.extractOffset()
      },

      onPanResponderMove: (_, g) => {
        tx.setValue(g.dx)
        const abs = Math.abs(g.dx)
        if (abs >= SWIPE_CONFIRM && hapticFired.current !== 'confirm') {
          hapticFired.current = 'confirm'
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        } else if (abs >= SWIPE_ACTIVATE && hapticFired.current === 'none') {
          hapticFired.current = 'activate'
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }
      },

      onPanResponderRelease: (_, g) => {
        tx.flattenOffset()
        if (g.dx < -SWIPE_CONFIRM) {
          // left swipe → mark done
          Animated.spring(tx, { toValue: 0, useNativeDriver: native, speed: 24, bounciness: 4 }).start()
          setDone(true)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          setTimeout(() => onDone(), 700)
        } else if (g.dx > SWIPE_CONFIRM) {
          // right swipe → delete
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          Animated.timing(tx, { toValue: SCREEN_W, duration: 220, useNativeDriver: native }).start(() => onDelete())
        } else {
          Animated.spring(tx, { toValue: 0, useNativeDriver: native, speed: 28, bounciness: 6 }).start()
        }
      },

      onPanResponderTerminate: () => {
        tx.flattenOffset()
        Animated.spring(tx, { toValue: 0, useNativeDriver: native, speed: 28, bounciness: 6 }).start()
      },
    })
  ).current

  const checkBg = tx.interpolate({
    inputRange: [-SWIPE_CONFIRM, -SWIPE_ACTIVATE, 0],
    outputRange: ['rgba(0,184,95,0.18)', 'rgba(0,184,95,0.10)', 'rgba(0,184,95,0)'],
    extrapolate: 'clamp',
  })
  const deleteBg = tx.interpolate({
    inputRange: [0, SWIPE_ACTIVATE, SWIPE_CONFIRM],
    outputRange: ['rgba(239,68,68,0)', 'rgba(239,68,68,0.10)', 'rgba(239,68,68,0.18)'],
    extrapolate: 'clamp',
  })
  const checkIconOp = tx.interpolate({ inputRange: [-SWIPE_ACTIVATE, -SWIPE_ACTIVATE * 0.4, 0], outputRange: [1, 0.4, 0], extrapolate: 'clamp' })
  const deleteIconOp = tx.interpolate({ inputRange: [0, SWIPE_ACTIVATE * 0.4, SWIPE_ACTIVATE], outputRange: [0, 0.4, 1], extrapolate: 'clamp' })

  return (
    <View style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 8 }}>
      {/* Right-swipe backdrop: delete */}
      <Animated.View style={{
        ...StyleSheet_absoluteFill,
        backgroundColor: deleteBg,
        borderRadius: 14,
        alignItems: 'flex-start', justifyContent: 'center', paddingLeft: 18,
      }}>
        <Animated.View style={{ opacity: deleteIconOp }}>
          <Trash2 size={19} color="#EF4444" strokeWidth={2} />
        </Animated.View>
      </Animated.View>

      {/* Left-swipe backdrop: done */}
      <Animated.View style={{
        ...StyleSheet_absoluteFill,
        backgroundColor: checkBg,
        borderRadius: 14,
        alignItems: 'flex-end', justifyContent: 'center', paddingRight: 18,
      }}>
        <Animated.View style={{ opacity: checkIconOp }}>
          <Check size={19} color="#00B85F" strokeWidth={2.5} />
        </Animated.View>
      </Animated.View>

      {/* Row */}
      <Animated.View style={{ transform: [{ translateX: tx }] }} {...pan.panHandlers}>
        <View style={{
          backgroundColor: done ? '#00B85F14' : colors.surface,
          borderWidth: 1,
          borderColor: done ? '#00B85F30' : colors.border,
          borderRadius: 16,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}>
          {/* Thumbnail */}
          <View style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden', backgroundColor: item.image ? colors.greenDeep : colors.obsidian }}>
            {item.image ? (
              <Image source={item.image} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
                <Image source={WORKIT_LOGO} style={{ width: '100%', height: '100%' }} contentFit="contain" />
              </View>
            )}
            {done && (
              <View style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,184,95,0.55)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={22} color={colors.white} strokeWidth={3} />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{
                fontFamily: 'Syne_700Bold', fontSize: 15, flex: 1, marginRight: 8,
                color: done ? '#00B85F' : colors.text,
                textDecorationLine: done ? 'line-through' : 'none',
              }}>
                {item.name}
              </Text>
              {item.trainingArea && (
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: colors.greenDeep, marginBottom: 4 }}>
                  {item.trainingArea}
                </Text>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Timer size={11} color={colors.textFaint} strokeWidth={1.8} />
                <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 11, color: colors.textFaint }}>{item.duration}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{
                backgroundColor: done ? '#00B85F22' : '#00E87A18',
                borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
              }}>
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 13, color: done ? '#00B85F' : '#00913F', letterSpacing: -0.2 }}>
                  {item.sets}
                </Text>
              </View>
              {item.calories != null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Zap size={11} color={colors.amber} strokeWidth={2} fill={colors.amber} />
                  <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 11, color: colors.textMuted }}>
                    ~{item.calories} kcal
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  )
}

// position:absolute helper (avoids importing StyleSheet just for this)
const StyleSheet_absoluteFill = {
  position: 'absolute' as const,
  top: 0, left: 0, right: 0, bottom: 0,
}

function formatElapsedShort(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 1)  return `${s}s`
  if (m < 60) return `${m}m ${s.toString().padStart(2, '0')}s`
  const h   = Math.floor(m / 60)
  const rem = m % 60
  return `${h}h ${rem.toString().padStart(2, '0')}m`
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const colors = useColors()
  const user = useAuthStore((s) => s.user)
  // Greeting prefers the member's chosen nickname, else the first name.
  const firstName = user?.nickname?.trim() || user?.full_name?.split(' ')[0] || 'there'
  const btnScale = useRef(new Animated.Value(1)).current
  const { status: sessionStatus, elapsed: sessionElapsed } = useSessionStore()
  const { membership, loading: membershipLoading } = useMembership()
  useNearbyGymPrompt(membership)
  const { createCheckIn, checkIns } = useCheckIns(membership?.gymId, membership?.id)
  const { activities: workoutActivities } = useWorkoutPlan()

  const h = new Date().getHours()
  const greetingLine =
    h >= 5 && h < 12 ? 'rise & shine?' :
    h >= 12 && h < 17 ? 'keep the momentum.' :
    'evening grind.'

  const { displayed: typedName } = useTypingAnimation(firstName, 'mygym_name')

  const [planItems, setPlanItems] = useState<PlanItem[]>([])
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [showJoinSheet, setShowJoinSheet] = useState(false)

  // Editable progress stats (in-session — resettable via the flip cards)
  const [checkins, setCheckins] = useState(0)
  const [daysLeft, setDaysLeft] = useState(0)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    const today = toTodayKey()
    const serverItems = workoutActivities[today] ?? []
    setPlanItems(serverItems.map((item) => ({
      id: item.id,
      name: item.name,
      sets: item.sets && item.reps ? `${item.sets}×${item.reps}` : '',
      duration: item.duration,
      calories: 0,
      trainingArea: item.trainingArea,
    })))
  }, [workoutActivities])

  useEffect(() => {
    const month = new Date().toISOString().slice(0, 7)
    const dates = checkIns
      .map((row) => row.checkedInAt.slice(0, 10))
      .filter((date, index, all) => date.startsWith(month) && all.indexOf(date) === index)
      .sort()
    setCheckins(dates.length)
    let current = 0
    const cursor = new Date()
    for (;;) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
      if (!dates.includes(key)) break
      current += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    setStreak(current)
  }, [checkIns])

  // Live "resets at midnight" countdown for the streak card
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const midnightCountdown = (() => {
    const d = new Date()
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0).getTime()
    const s = Math.max(0, Math.floor((end - now) / 1000))
    const hh = String(Math.floor(s / 3600)).padStart(2, '0')
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return `Resets ${hh}:${mm}:${ss}`
  })()

  function markDone(id: string) {
    setDoneIds((prev) => new Set([...prev, id]))
  }
  function deleteItem(id: string) {
    setPlanItems(prev => prev.filter(i => i.id !== id))
    setDoneIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  if (membershipLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    )
  }

  // Only members who have NEVER had a membership see the empty state.
  // An expired membership still shows the card (in a red/renew state).
  if (!membership) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{
          width: 72, height: 72, borderRadius: 20,
          backgroundColor: colors.stone2, alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        }}>
          <Dumbbell size={32} color={colors.textMuted} strokeWidth={1.5} />
        </View>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, letterSpacing: -0.44, color: colors.text, textAlign: 'center', marginBottom: 8 }}>
          You're not a member yet.
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 24, marginBottom: 32 }}>
          Find a gym that fits you and join today.
        </Text>
        <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%' }}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(member)/discover') }}
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: native, speed: 50, bounciness: 0 }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: native, speed: 30, bounciness: 4 }).start()}
            style={{ height: 56, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.obsidian, letterSpacing: -0.3 }}>Browse gyms</Text>
          </Pressable>
        </Animated.View>
      </View>
    )
  }

  // Membership identity/status is real; workout-plan/streak/checkins remain
  // in-session mock until those features have a backend.
  const isExpired = membership.displayStatus === 'expired'
  const isCancelled = membership.displayStatus === 'cancelled'
  const canCheckIn = membership.hasAccess // false once expired
  const m = {
    ...MOCK_MEMBERSHIP,
    gymName: membership.gymName,
    gymId: membership.gymId,
    plan: membership.planName,
    expires: formatDateLong(membership.endDate),
    daysLeft: membership.daysLeft,
    planDays: Math.max(1, Math.ceil((new Date(`${membership.endDate}T00:00:00`).getTime() - new Date(`${membership.startDate}T00:00:00`).getTime()) / 86400000)),
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, letterSpacing: -0.5, color: colors.text }} numberOfLines={1}>
                {typedName}<Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, color: colors.text }}>,</Text>{' '}
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted, letterSpacing: 0 }}>{greetingLine}</Text>
              </Text>
            </View>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(member)/notifications') }}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4, marginTop: 4 })}
            >
              <Bell size={20} color={colors.text} strokeWidth={1.75} />
            </Pressable>
          </View>
        </View>

        {/* ── Membership card ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{ backgroundColor: '#050C07', borderRadius: 22, overflow: 'hidden' }}>
            {/* Dumbbell photo */}
            <Image
              source={MEMBERSHIP_BG}
              style={{ position: 'absolute', top: -2, left: -2, right: -2, bottom: -2 }}
              contentFit="cover"
              contentPosition="center"
              transition={200}
            />
            {/* Full dark scrim */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(3,12,6,0.76)' }} />

            {/* Card content */}
            <View style={{ padding: 20 }}>
              {/* Top row: gym name + membership active pill */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, letterSpacing: -0.44, color: colors.chalk }}>
                  {m.gymName}
                </Text>
                <View style={{
                  borderWidth: 1,
                  borderColor: isExpired ? 'rgba(255,68,68,0.4)' : isCancelled ? 'rgba(245,158,11,0.35)' : 'rgba(0,232,122,0.35)',
                  borderRadius: 999,
                  paddingHorizontal: 10, paddingVertical: 4,
                  backgroundColor: isExpired ? 'rgba(255,68,68,0.14)' : isCancelled ? 'rgba(245,158,11,0.12)' : 'rgba(0,232,122,0.12)',
                }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: isExpired ? colors.ember : isCancelled ? colors.amber : colors.green, letterSpacing: 0.2 }}>
                    {isExpired ? 'Expired' : isCancelled ? 'Cancelled' : 'Membership Active'}
                  </Text>
                </View>
              </View>

              {/* Member code */}
              <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: 'rgba(245,245,240,0.26)', letterSpacing: 2.8, marginBottom: 16 }}>
                {m.memberCode}
              </Text>

              {/* Accent divider */}
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 16 }} />

              {/* Plan · Expires · Renewal */}
              <View style={{ flexDirection: 'row', gap: 28, marginBottom: 18 }}>
                <View>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, color: 'rgba(245,245,240,0.32)', marginBottom: 4, letterSpacing: 0.8, textTransform: 'uppercase' }}>Plan</Text>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.chalk }}>{m.plan}</Text>
                </View>
                <View>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, color: 'rgba(245,245,240,0.32)', marginBottom: 4, letterSpacing: 0.8, textTransform: 'uppercase' }}>Expires</Text>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.chalk }}>{m.expires}</Text>
                </View>
                <View>
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, color: 'rgba(245,245,240,0.32)', marginBottom: 4, letterSpacing: 0.8, textTransform: 'uppercase' }}>Renewal</Text>
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.chalk }}>{m.nextRenewal}</Text>
                </View>
              </View>

              {/* Check In button — disabled when membership has expired */}
              {!canCheckIn ? (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                    setShowJoinSheet(true)
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
                >
                  <View style={{ width: '100%', minHeight: 52, borderRadius: 999,
                    backgroundColor: 'rgba(255,68,68,0.14)',
                    borderWidth: 1, borderColor: 'rgba(255,68,68,0.4)',
                    alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 16,
                  }}
                >
                  <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 14, color: colors.ember, letterSpacing: -0.2 }}>
                    Membership expired · Renew
                  </Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowCheckIn(true) }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
                >
                  <View style={{ width: '100%', minHeight: 52, borderRadius: 999,
                    backgroundColor: sessionStatus === 'in' ? colors.obsidian : colors.green,
                    alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'row', gap: 8,
                    borderWidth: sessionStatus === 'in' ? 1 : 0,
                    borderColor: 'rgba(0,232,122,0.25)',
                    paddingHorizontal: 16,
                  }}
                >
                  {sessionStatus === 'in' ? (
                    <>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green }} />
                      <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 15, color: colors.chalk, letterSpacing: 0.4 }}>
                        {formatElapsedShort(sessionElapsed)}
                      </Text>
                      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(245,245,240,0.45)' }}>
                        · In session
                      </Text>
                    </>
                  ) : (
                    <>
                      <CalendarCheck size={18} color={colors.obsidian} strokeWidth={2.2} />
                      <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 15, color: colors.obsidian, letterSpacing: -0.3 }}>Check In</Text>
                    </>
                  )}
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* ── Your progress ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, letterSpacing: -0.34, color: colors.text }}>Your progress</Text>
          </View>
          <View style={{
            flexDirection: 'row', backgroundColor: colors.surface,
            borderRadius: 20, borderWidth: 1, borderColor: colors.border,
            paddingVertical: 20, paddingHorizontal: 8,
          }}>
            <ProgressStat
              kind="calendar" Icon={CalendarDays} iconColor={colors.greenDeep}
              progress={checkins / m.checkinsGoal} count={checkins}
              label="Check-ins" sub="this month"
              countdown="Resets monthly" onSave={setCheckins}
            />
            <ProgressStat
              kind="clock" Icon={Clock} iconColor={colors.amber}
              progress={daysLeft / m.planDays} count={daysLeft}
              label="Days left" sub="on this plan"
              countdown={`Renews ${daysLeft}d`} onSave={() => {}}
            />
            <ProgressStat
              kind="flame" Icon={Flame} iconColor={colors.green}
              progress={streak / m.streakGoal} count={streak} unit=" day"
              valueColor={colors.greenDeep} label="Current streak" sub="Keep going!"
              countdown={midnightCountdown} onSave={setStreak}
            />
          </View>
        </View>

        {/* ── Today's plan ── */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, letterSpacing: -0.34, color: colors.text }}>Today's plan</Text>
              {planItems.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                  <Zap size={11} color={colors.amber} strokeWidth={2} fill={colors.amber} />
                  <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 11, color: colors.textMuted }}>
                    {planItems.reduce((s, i) => s + (i.calories ?? 0), 0)} kcal total
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(member)/activity') }}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 34, height: 34, borderRadius: 12,
                backgroundColor: colors.stone2,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Plus size={18} color={colors.text} strokeWidth={2.2} />
            </Pressable>
          </View>

          {planItems.length === 0 || planItems.every(i => doneIds.has(i.id)) ? (
            <View style={{ alignItems: 'center', paddingVertical: 36 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#00B85F15', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Check size={22} color="#00B85F" strokeWidth={2.5} />
              </View>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, color: colors.text, letterSpacing: -0.34 }}>All done.</Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginTop: 4 }}>You crushed today's plan.</Text>
            </View>
          ) : (
            planItems.map(item => (
              <SwipeableRow
                key={item.id}
                item={item}
                initialDone={doneIds.has(item.id)}
                onDone={() => markDone(item.id)}
                onDelete={() => deleteItem(item.id)}
              />
            ))
          )}
        </View>

      </ScrollView>

      <CheckInOverlay
        visible={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        onCheckIn={async () => { await createCheckIn(); setCheckins((value) => value + 1) }}
      />
      <JoinGymSheet
        visible={showJoinSheet}
        gymId={membership.gymId}
        gymName={membership.gymName}
        onClose={() => setShowJoinSheet(false)}
      />
    </View>
  )
}
