import React, { useState, useRef, useEffect } from 'react'
import { View, Text, ScrollView, Pressable, Animated, TextInput, PanResponder, Dimensions } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { Plus, Clock, Flame, Target, Trash2, Check } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'
import { useWeightStore, goalProgress, estimatedWeight } from '@/lib/stores/weightStore'
import { useActivityStore, Activity } from '@/lib/stores/activityStore'
import { useWorkoutPlan } from '@/lib/hooks/useWorkoutPlan'

const SCREEN_W = Dimensions.get('window').width
const SWIPE_THRESHOLD = 80

const today = new Date()
const DAY_NAMES  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAYS  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Build the current week (Mon → Sun)
function buildWeek() {
  const base = new Date(today)
  // Shift to Monday of this week
  const dow = today.getDay() // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow
  base.setDate(today.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return {
      short:   DAY_NAMES[d.getDay()],
      full:    FULL_DAYS[d.getDay()],
      num:     d.getDate(),
      month:   MONTH_NAMES[d.getMonth()],
      dateKey: d.toDateString(),
      isToday: d.toDateString() === today.toDateString(),
    }
  })
}

const WEEK = buildWeek()
const todayKey = today.toDateString()
const todayWeekIdx = WEEK.findIndex(d => d.isToday)


const CATEGORY_COLORS: Record<string, string> = {
  Strength: '#6366F1',
  Cardio:   '#F59E0B',
  Combat:   '#EF4444',
  Other:    '#6B7280',
}

// ── Swipeable activity row (swipe left to delete) ─────────────────────────────
function ActivityRow({ act, onDelete, onToggle }: { act: Activity; onDelete: () => void; onToggle?: () => void }) {
  const colors = useColors()
  const tx = useRef(new Animated.Value(0)).current
  const hapticFired = useRef(false)

  const deleting = useRef(false)
  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.15,

    onPanResponderGrant: () => {
      hapticFired.current = false
      tx.stopAnimation()
      tx.setOffset(0)
      tx.setValue(0)
    },

    onPanResponderMove: (_, g) => {
      const nextX = Math.max(-SCREEN_W, Math.min(SCREEN_W, g.dx))
      tx.setValue(nextX)
      if (Math.abs(g.dx) >= SWIPE_THRESHOLD && !hapticFired.current) {
        hapticFired.current = true
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      }
    },

    onPanResponderRelease: (_, g) => {
      tx.flattenOffset()
      if (!deleting.current && Math.abs(g.dx) >= SWIPE_THRESHOLD) {
        deleting.current = true
        const direction = g.dx < 0 ? -1 : 1
        Animated.timing(tx, { toValue: direction * SCREEN_W, duration: 180, useNativeDriver: native }).start(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
          onDelete()
        })
      } else {
        Animated.spring(tx, { toValue: 0, useNativeDriver: native, speed: 24, bounciness: 7 }).start()
      }
    },

    onPanResponderTerminate: () => {
      tx.flattenOffset()
      Animated.spring(tx, { toValue: 0, useNativeDriver: native, speed: 30, bounciness: 6 }).start()
    },
  })).current

  const deleteOpacity = tx.interpolate({ inputRange: [-SWIPE_THRESHOLD, -20, 0], outputRange: [1, 0.4, 0], extrapolate: 'clamp' })

  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
      {/* Delete backdrop */}
      <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, left: 0, backgroundColor: '#FEE2E2', borderRadius: 16, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 20 }}>
        <Animated.View style={{ opacity: deleteOpacity, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Trash2 size={16} color="#EF4444" strokeWidth={2} />
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#EF4444' }}>Delete</Text>
        </Animated.View>
      </View>

      <Animated.View style={{ transform: [{ translateX: tx }] }} {...pan.panHandlers}>
        <View style={{
          backgroundColor: colors.surface, borderRadius: 16,
          borderWidth: 1, borderColor: colors.border,
          padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
        }}>
          {onToggle ? (
            <Pressable
              onPress={onToggle}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: Boolean(act.completed) }}
              style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: act.completed ? colors.green : colors.border, backgroundColor: act.completed ? colors.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {act.completed ? <Check size={15} color={colors.obsidian} strokeWidth={3} /> : null}
              </View>
            </Pressable>
          ) : (
            <View style={{ width: 3, height: 36, borderRadius: 2, backgroundColor: CATEGORY_COLORS[act.category] ?? colors.border }} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: act.completed ? colors.textMuted : colors.text, textDecorationLine: act.completed ? 'line-through' : 'none', marginBottom: 3 }}>{act.name}</Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted }}>{act.category}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: colors.textFaint }}>
              {act.duration || (act.durationMins != null && act.durationMins > 0 ? `${act.durationMins} min` : '')}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  )
}

// ── Weight goal card ──────────────────────────────────────────────────────────
function WeightGoalCard() {
  const colors = useColors()
  const { currentWeight, dreamWeight, sessionsCompleted, setGoal } = useWeightStore()
  const hasGoal = currentWeight !== null && dreamWeight !== null

  const [editing, setEditing] = useState(false)
  const [currentInput, setCurrentInput] = useState('')
  const [dreamInput, setDreamInput] = useState('')

  const progress = goalProgress(sessionsCompleted)
  const fillAnim = useRef(new Animated.Value(progress)).current

  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: progress,
      useNativeDriver: false,
      speed: 6,
      bounciness: 4,
    }).start()
  }, [progress])

  function handleSave() {
    const cur = parseFloat(currentInput)
    const dream = parseFloat(dreamInput)
    if (!cur || !dream || cur <= 0 || dream <= 0) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setGoal(cur, dream)
    setEditing(false)
  }

  function openEdit() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentInput(currentWeight ? String(currentWeight) : '')
    setDreamInput(dreamWeight ? String(dreamWeight) : '')
    setEditing(true)
  }

  // ── Set-up / edit form ──
  if (editing || !hasGoal) {
    return (
      <View style={{
        backgroundColor: colors.surface, borderRadius: 18,
        borderWidth: 1, borderColor: colors.border,
        padding: 18, marginBottom: 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <View style={{
            width: 30, height: 30, borderRadius: 9,
            backgroundColor: `${colors.green}18`,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={15} color={colors.greenDeep} strokeWidth={2} />
          </View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: colors.text }}>
            {hasGoal ? 'Update goal' : 'Set weight goal'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, letterSpacing: 0.5, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
              Current (kg)
            </Text>
            <TextInput
              value={currentInput}
              onChangeText={setCurrentInput}
              keyboardType="numeric"
              placeholder="e.g. 82"
              placeholderTextColor={colors.textFaint}
              style={{
                height: 46, borderRadius: 12,
                borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.bg,
                paddingHorizontal: 14,
                fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.text,
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, letterSpacing: 0.5, color: colors.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>
              Dream (kg)
            </Text>
            <TextInput
              value={dreamInput}
              onChangeText={setDreamInput}
              keyboardType="numeric"
              placeholder="e.g. 74"
              placeholderTextColor={colors.textFaint}
              style={{
                height: 46, borderRadius: 12,
                borderWidth: 1, borderColor: colors.border,
                backgroundColor: colors.bg,
                paddingHorizontal: 14,
                fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colors.text,
              }}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {editing && hasGoal && (
            <Pressable
              onPress={() => setEditing(false)}
              style={({ pressed }) => ({
                flex: 1, height: 46, borderRadius: 12,
                backgroundColor: colors.stone2,
                alignItems: 'center', justifyContent: 'center',
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>Cancel</Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => ({
              flex: 1, height: 46, borderRadius: 12,
              backgroundColor: colors.green,
              alignItems: 'center', justifyContent: 'center',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 14, color: colors.obsidian }}>Save goal</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // ── Progress view ──
  const estimated = estimatedWeight(currentWeight, dreamWeight, sessionsCompleted)
  const fillWidth = fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['2%', '100%'] })

  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: 18,
      borderWidth: 1, borderColor: colors.border,
      padding: 16, marginBottom: 20,
    }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{
            width: 28, height: 28, borderRadius: 8,
            backgroundColor: `${colors.green}18`,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={14} color={colors.greenDeep} strokeWidth={2} />
          </View>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>
            Weight goal
          </Text>
        </View>
        <Pressable onPress={openEdit} hitSlop={10}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.textMuted }}>Edit</Text>
        </Pressable>
      </View>

      {/* Weight numbers row */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <View>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint, marginBottom: 2 }}>Current</Text>
          <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 18, color: colors.text, letterSpacing: -0.4 }}>
            {estimated} <Text style={{ fontSize: 12, color: colors.textMuted }}>kg</Text>
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textFaint, marginBottom: 2 }}>Goal</Text>
          <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 18, color: colors.greenDeep, letterSpacing: -0.4 }}>
            {dreamWeight} <Text style={{ fontSize: 12 }}>kg</Text>
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ height: 6, borderRadius: 999, backgroundColor: colors.stone2, overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', borderRadius: 999, width: fillWidth, backgroundColor: colors.green }} />
      </View>
    </View>
  )
}

export default function ActivityScreen() {
  const colors = useColors()
  const [selectedIdx, setSelectedIdx] = useState(todayWeekIdx >= 0 ? todayWeekIdx : 0)
  const { activities: localActivities, deleteActivity } = useActivityStore()
  const { activities: serverActivities, toggleExercise } = useWorkoutPlan()

  const day     = WEEK[selectedIdx]
  const dayActs = serverActivities[day.dateKey] ?? localActivities[day.dateKey] ?? []
  const totalMin = dayActs.reduce((s, a) => s + (a.durationMins ?? 0), 0)
  const totalCal = dayActs.reduce((s, a) => s + (a.durationMins ? Math.round(a.durationMins * 5.5) : 0), 0)

  function goAdd() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push({ pathname: '/(member)/activity-edit', params: { dateKey: day.dateKey, dateLabel: `${day.full}, ${day.month} ${day.num}` } })
  }

  const HAS_MEMBERSHIP = true

  if (!HAS_MEMBERSHIP) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, letterSpacing: -0.44, color: colors.text, textAlign: 'center', marginBottom: 10 }}>
          Your activity plan lives here.
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Join a gym to unlock your personal activity schedule.
        </Text>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(member)/discover') }}
          style={({ pressed }) => ({
            height: 52, paddingHorizontal: 28, borderRadius: 14,
            backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pressed ? 0.97 : 1 }],
          })}
        >
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 15, color: colors.obsidian }}>Find a gym</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 44, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, letterSpacing: -0.52, color: colors.text }}>Activity</Text>
      </View>

      {/* ── Week strip ── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', backgroundColor: colors.stone2, borderRadius: 16, padding: 4, gap: 2 }}>
          {WEEK.map((d, i) => {
            const active  = selectedIdx === i
            const hasActs = (serverActivities[d.dateKey] ?? localActivities[d.dateKey] ?? []).length > 0
            return (
              <Pressable
                key={i}
                onPress={() => { setSelectedIdx(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 9,
                  borderRadius: 12,
                  backgroundColor: active ? colors.surface : 'transparent',
                  shadowColor: active ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: active ? 0.08 : 0,
                  shadowRadius: 3, elevation: active ? 2 : 0,
                }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: active ? colors.textMuted : colors.textFaint, marginBottom: 4 }}>
                  {d.short}
                </Text>
                <Text style={{ fontFamily: active ? 'Syne_700Bold' : 'DMSans_400Regular', fontSize: 15, color: active ? colors.text : colors.textMuted, marginBottom: 5 }}>
                  {d.num}
                </Text>
                {/* Activity dot */}
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: hasActs ? colors.green : 'transparent' }} />
              </Pressable>
            )
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Weight goal */}
        <WeightGoalCard />

        {/* Day heading row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, letterSpacing: -0.36, color: colors.text }}>
            {day.isToday ? 'Today' : `${day.short}, ${day.month} ${day.num}`}
          </Text>

          {dayActs.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Clock size={11} color={colors.textFaint} strokeWidth={1.75} />
                <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: colors.textFaint }}>{totalMin}m</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Flame size={11} color={colors.amber} strokeWidth={1.75} />
                <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: colors.textFaint }}>{totalCal}</Text>
              </View>
            </View>
          )}
        </View>

        {dayActs.length > 0 ? (
          <View>
            {dayActs.map((act) => (
              <ActivityRow
                key={act.id}
                act={act}
                onDelete={() => deleteActivity(day.dateKey, act.id)}
                onToggle={serverActivities[day.dateKey]?.some((item) => item.id === act.id) ? async () => {
                  try {
                    await toggleExercise(act.id, !act.completed)
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
                  } catch {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
                  }
                } : undefined}
              />
            ))}

            {/* Add more */}
            <Pressable onPress={goAdd} style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.82 : 1 })}>
              <View style={{ height: 50, width: '100%', borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Plus size={15} color={colors.textMuted} strokeWidth={2} />
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.textMuted }}>Add activity</Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={{
            backgroundColor: colors.surface, borderRadius: 18,
            borderWidth: 1, borderColor: colors.border,
            paddingVertical: 52, alignItems: 'center',
          }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, letterSpacing: -0.34, color: colors.text, marginBottom: 20 }}>
              {day.isToday ? 'Nothing planned today' : 'Rest day'}
            </Text>
            <Pressable onPress={goAdd} style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}>
              <View style={{ height: 40, paddingHorizontal: 20, borderRadius: 999, backgroundColor: colors.obsidian, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Plus size={14} color={colors.chalk} strokeWidth={2.2} />
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.chalk }}>Add activity</Text>
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
