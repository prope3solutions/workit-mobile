import React, { useState, useRef } from 'react'
import {
  View, Text, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform, Animated, PanResponder, Dimensions, LayoutAnimation, UIManager,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { X, Check, Plus, Timer, Repeat2, Zap } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'
import { useActivityStore } from '@/lib/stores/activityStore'
import { useWorkoutPlan } from '@/lib/hooks/useWorkoutPlan'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const SCREEN_W = Dimensions.get('window').width
const SLIDER_W = SCREEN_W - 40 - 32

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const EQUIPMENT_GROUPS: { category: string; accent: string; items: string[] }[] = [
  {
    category: 'Strength',
    accent: '#A78BFA',
    items: ['Squat Rack', 'Bench Press', 'Dumbbells', 'Cable Machine', 'Barbells'],
  },
  {
    category: 'Cardio',
    accent: '#FBBF24',
    items: ['Treadmill', 'Rowing Machine', 'Spin Bike', 'Elliptical'],
  },
  {
    category: 'Combat',
    accent: '#F87171',
    items: ['Boxing Bag', 'MMA Mat', 'Skipping Rope'],
  },
]

const TRAINING_AREAS: Record<string, 'Upper A' | 'Lower A' | 'Upper B' | 'Lower B'> = {
  'Squat Rack': 'Lower A', 'Bench Press': 'Upper A', 'Dumbbells': 'Upper B', 'Cable Machine': 'Upper B', 'Barbells': 'Lower B',
  'Treadmill': 'Lower A', 'Rowing Machine': 'Upper A', 'Spin Bike': 'Lower B', 'Elliptical': 'Lower A',
  'Boxing Bag': 'Upper B', 'MMA Mat': 'Upper A', 'Skipping Rope': 'Lower B',
}

// Calories per minute for duration mode, or per set for reps mode
const CAL_PER_MIN: Record<string, number> = {
  'Squat Rack': 7, 'Bench Press': 5, 'Dumbbells': 5, 'Cable Machine': 5, 'Barbells': 6,
  'Treadmill': 10, 'Rowing Machine': 9, 'Spin Bike': 10, 'Elliptical': 8,
  'Boxing Bag': 9, 'MMA Mat': 8, 'Skipping Rope': 11,
}
const CAL_PER_SET: Record<string, number> = {
  'Squat Rack': 18, 'Bench Press': 14, 'Dumbbells': 12, 'Cable Machine': 11, 'Barbells': 15,
  'Treadmill': 0, 'Rowing Machine': 0, 'Spin Bike': 0, 'Elliptical': 0,
  'Boxing Bag': 20, 'MMA Mat': 16, 'Skipping Rope': 8,
}

type Mode = 'duration' | 'reps'

interface ItemConfig {
  mode: Mode
  duration: number   // minutes (duration mode)
  sets: string       // reps mode
  reps: string       // reps mode
  weight: string     // optional kilograms
}

function estimateCals(name: string, cfg: ItemConfig): number {
  if (cfg.mode === 'duration') {
    return Math.round((CAL_PER_MIN[name] ?? 6) * cfg.duration)
  }
  const s = parseInt(cfg.sets, 10) || 0
  return Math.round((CAL_PER_SET[name] ?? 10) * s)
}

const MIN_MINS = 5
const MAX_MINS = 120
const STEP = 5

function snapToStep(v: number) { return Math.round(v / STEP) * STEP }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
function minsToLabel(m: number) {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`
}
function getTodayShort() {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]
}

function minsLabel(m: number): string {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h}h` : `${h}h ${r}m`
}

// ── Duration slider ───────────────────────────────────────────────────────────
function DurationSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const colors = useColors()
  const [sliderWidth, setSliderWidth] = useState(0)
  const lastHaptic = useRef(value)
  const baseVal = useRef(value)
  const sliderWidthRef = useRef(0)

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        baseVal.current = value
        lastHaptic.current = value
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      },
      onPanResponderMove: (_, g) => {
        const sw = sliderWidthRef.current || 260
        const delta = (g.dx / sw) * (MAX_MINS - MIN_MINS)
        const snapped = snapToStep(clamp(baseVal.current + delta, MIN_MINS, MAX_MINS))
        if (snapped !== lastHaptic.current) {
          lastHaptic.current = snapped
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onChange(snapped)
        }
      },
      onPanResponderRelease: (_, g) => {
        const sw = sliderWidthRef.current || 260
        const delta = (g.dx / sw) * (MAX_MINS - MIN_MINS)
        const snapped = snapToStep(clamp(baseVal.current + delta, MIN_MINS, MAX_MINS))
        baseVal.current = snapped
        onChange(snapped)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      },
    })
  ).current

  const fraction = (value - MIN_MINS) / (MAX_MINS - MIN_MINS)
  const thumbX = sliderWidth > 0 ? fraction * sliderWidth : 0

  return (
    <View style={{ marginTop: 12, width: '100%' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: colors.textFaint }}>
          {minsToLabel(MIN_MINS)}
        </Text>
        <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: '#00913F', letterSpacing: 0.3 }}>
          {minsToLabel(value)}
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: colors.textFaint }}>
          {minsToLabel(MAX_MINS)}
        </Text>
      </View>
      <View
        style={{ height: 32, justifyContent: 'center', width: '100%' }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width
          if (w > 0 && w !== sliderWidthRef.current) {
            sliderWidthRef.current = w
            setSliderWidth(w)
          }
        }}
        {...pan.panHandlers}
      >
        <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.08)', width: '100%' }} />
        {sliderWidth > 0 && (
          <>
            <View style={{ position: 'absolute', height: 3, borderRadius: 2, backgroundColor: colors.green, width: thumbX }} />
            {[0.25, 0.5, 0.75].map(f => (
              <View key={f} style={{
                position: 'absolute', left: f * sliderWidth - 1,
                width: 2, height: 6, borderRadius: 1, top: 13,
                backgroundColor: fraction >= f ? 'rgba(0,184,95,0.4)' : 'rgba(0,0,0,0.1)',
              }} />
            ))}
            <View style={{
              position: 'absolute', left: Math.max(0, Math.min(sliderWidth - 28, thumbX - 14)),
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: '#fff',
              borderWidth: 2, borderColor: colors.green,
              shadowColor: colors.green, shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3,
            }}>
              <View style={{ width: 2, height: 9, borderRadius: 1, backgroundColor: colors.green + 'AA' }} />
              <View style={{ width: 2, height: 9, borderRadius: 1, backgroundColor: colors.green + 'AA' }} />
            </View>
          </>
        )}
      </View>
    </View>
  )
}

// ── Reps/Sets input ───────────────────────────────────────────────────────────
function RepsInput({ sets, reps, weight, onSetsChange, onRepsChange, onWeightChange }: {
  sets: string; reps: string; weight: string
  onSetsChange: (v: string) => void
  onRepsChange: (v: string) => void
  onWeightChange: (v: string) => void
}) {
  const colors = useColors()
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, width: '100%' }}>
      {([
        { label: 'Sets', value: sets, onChange: onSetsChange, max: 20 },
        { label: 'Reps', value: reps, onChange: onRepsChange, max: 50 },
        { label: 'Kg', value: weight, onChange: onWeightChange, max: 999 },
      ] as const).map(({ label, value, onChange, max }) => (
        <View key={label} style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 10, color: colors.textFaint, marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {label}
          </Text>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.bg,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.green + '55',
            overflow: 'hidden',
            width: '100%',
            minWidth: 0,
            height: 44,
          }}>
            <Pressable
              onPress={() => onChange(String(Math.max(1, (parseInt(value, 10) || 1) - 1)))}
              hitSlop={8}
              style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.textMuted }}>−</Text>
            </Pressable>
            <TextInput
              value={value}
              onChangeText={v => {
                const n = v.replace(/\D/g, '')
                if (n === '' || parseInt(n, 10) <= max) onChange(n)
              }}
              keyboardType="number-pad"
              selectTextOnFocus
              maxLength={2}
              style={{
                flex: 1,
                minWidth: 0,
                height: 44,
                textAlign: 'center',
                fontFamily: 'Syne_700Bold',
                fontSize: 18,
                color: colors.text,
                paddingHorizontal: 0,
              }}
            />
            <Pressable
              onPress={() => onChange(String(Math.min(max, (parseInt(value, 10) || 0) + 1)))}
              hitSlop={8}
              style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: '#00913F' }}>+</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  )
}

// ── Equipment item ─────────────────────────────────────────────────────────────
function EquipmentItem({
  item, selected, config, accent,
  onToggle, onConfigChange,
}: {
  item: string; selected: boolean; config: ItemConfig; accent: string
  onToggle: () => void
  onConfigChange: (c: Partial<ItemConfig>) => void
}) {
  const colors = useColors()
  const heightAnim = useRef(new Animated.Value(selected ? 1 : 0)).current
  // Only strength items support reps mode; cardio stays on duration
  const supportsReps = CAL_PER_SET[item] > 0

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    Animated.spring(heightAnim, {
      toValue: selected ? 0 : 1,
      useNativeDriver: false,
      speed: 18, bounciness: 4,
    }).start()
    onToggle()
  }

  const cals = estimateCals(item, config)

  return (
    <View style={{
      backgroundColor: selected ? '#F0FFF7' : colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: selected ? '#00B85F40' : colors.border,
      overflow: 'hidden',
      marginBottom: 8,
    }}>
      <Pressable
        onPress={toggle}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 10 }}
      >
        <View style={{
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: selected ? colors.green : 'transparent',
          borderWidth: selected ? 0 : 1.5,
          borderColor: colors.border,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {selected && <Check size={12} color={colors.obsidian} strokeWidth={3} />}
        </View>
        <Text style={{ flex: 1, fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>
          {item}
        </Text>
        {selected && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Zap size={10} color={colors.amber} strokeWidth={2} fill={colors.amber} />
              <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 11, color: colors.textMuted }}>{cals}</Text>
            </View>
            <View style={{ backgroundColor: colors.green + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 11, color: '#00913F', letterSpacing: 0.3 }}>
                {config.mode === 'duration' ? minsToLabel(config.duration) : `${config.sets}×${config.reps}`}
              </Text>
            </View>
          </View>
        )}
      </Pressable>

      {selected && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <View style={{ height: 1, backgroundColor: '#00B85F18', marginBottom: 10 }} />

          {/* Mode toggle — only for exercises that support reps */}
          {supportsReps && (
            <View style={{
              flexDirection: 'row', gap: 6, marginBottom: 4,
              backgroundColor: colors.stone2, borderRadius: 10, padding: 3,
            }}>
              <Pressable
                onPress={() => onConfigChange({ mode: 'reps' })}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 5, paddingVertical: 7, borderRadius: 8,
                  backgroundColor: config.mode === 'reps' ? colors.bg : 'transparent',
                  borderWidth: config.mode === 'reps' ? 1 : 0,
                  borderColor: config.mode === 'reps' ? '#00B85F30' : 'transparent',
                }}
              >
                <Repeat2 size={13} color={config.mode === 'reps' ? '#00913F' : colors.textFaint} strokeWidth={2} />
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: config.mode === 'reps' ? '#00913F' : colors.textFaint }}>Sets & Reps</Text>
              </Pressable>
              <Pressable
                onPress={() => onConfigChange({ mode: 'duration' })}
                style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 5, paddingVertical: 7, borderRadius: 8,
                  backgroundColor: config.mode === 'duration' ? colors.bg : 'transparent',
                  borderWidth: config.mode === 'duration' ? 1 : 0,
                  borderColor: config.mode === 'duration' ? '#00B85F30' : 'transparent',
                }}
              >
                <Timer size={13} color={config.mode === 'duration' ? '#00913F' : colors.textFaint} strokeWidth={2} />
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: config.mode === 'duration' ? '#00913F' : colors.textFaint }}>Duration</Text>
              </Pressable>
            </View>
          )}

          {config.mode === 'duration' ? (
            <DurationSlider
              value={config.duration}
              onChange={(v) => onConfigChange({ duration: v })}
            />
          ) : (
            <RepsInput
              sets={config.sets}
              reps={config.reps}
              weight={config.weight}
              onSetsChange={(v) => onConfigChange({ sets: v })}
              onRepsChange={(v) => onConfigChange({ reps: v })}
              onWeightChange={(v) => onConfigChange({ weight: v })}
            />
          )}
        </View>
      )}
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  'Squat Rack': 'Strength', 'Bench Press': 'Strength', 'Dumbbells': 'Strength',
  'Cable Machine': 'Strength', 'Barbells': 'Strength',
  'Treadmill': 'Cardio', 'Rowing Machine': 'Cardio', 'Spin Bike': 'Cardio', 'Elliptical': 'Cardio',
  'Boxing Bag': 'Combat', 'MMA Mat': 'Combat', 'Skipping Rope': 'Combat',
}

function getCategory(name: string): string {
  return CATEGORY_MAP[name] ?? 'Other'
}

function defaultConfig(name: string): ItemConfig {
  const supportsReps = CAL_PER_SET[name] > 0
  return {
    mode: supportsReps ? 'reps' : 'duration',
    duration: 30,
    sets: '4',
    reps: '8',
    weight: '',
  }
}

export default function ActivityEditScreen() {
  const colors = useColors()
  const params = useLocalSearchParams<{ dateKey?: string; dateLabel?: string }>()
  const dateLabel = params.dateLabel ?? ''
  const passedDateKey = params.dateKey ?? ''
  const addActivities = useActivityStore(s => s.addActivities)
  const { saveActivities } = useWorkoutPlan()

  function defaultDay(): string {
    if (dateLabel) {
      for (const d of DAYS) {
        if (dateLabel.startsWith(d) || dateLabel.includes(d)) return d
      }
    }
    return getTodayShort()
  }

  const [selectedDays, setSelectedDays] = useState<string[]>([defaultDay()])
  const [selectedItems, setSelectedItems] = useState<Record<string, ItemConfig>>({})
  const [notes, setNotes] = useState('')
  const [customItems, setCustomItems] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  function toggleDay(d: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedDays(prev =>
      prev.includes(d) ? (prev.length > 1 ? prev.filter(x => x !== d) : prev) : [...prev, d]
    )
  }

  function toggleItem(item: string) {
    setSelectedItems(prev => {
      if (item in prev) {
        const next = { ...prev }
        delete next[item]
        return next
      }
      return { ...prev, [item]: defaultConfig(item) }
    })
  }

  function updateItemConfig(item: string, patch: Partial<ItemConfig>) {
    setSelectedItems(prev => ({
      ...prev,
      [item]: { ...prev[item], ...patch },
    }))
  }

  function addCustomItem() {
    const trimmed = customInput.trim()
    if (!trimmed) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (!customItems.includes(trimmed)) setCustomItems(prev => [...prev, trimmed])
    setSelectedItems(prev => ({ ...prev, [trimmed]: defaultConfig(trimmed) }))
    setCustomInput('')
    setShowCustomInput(false)
  }

  function removeCustomItem(item: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    setCustomItems(prev => prev.filter(x => x !== item))
    setSelectedItems(prev => { const n = { ...prev }; delete n[item]; return n })
  }

  const totalSelected = Object.keys(selectedItems).length
  const canSave = totalSelected > 0 && selectedDays.length > 0

  const totalCals = Object.entries(selectedItems).reduce((sum, [name, cfg]) => sum + estimateCals(name, cfg), 0)

  async function handleSave() {
    if (!canSave) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    const newActivities = Object.entries(selectedItems).map(([name, cfg]) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      duration: cfg.mode === 'duration' ? minsLabel(cfg.duration) : `${cfg.sets}×${cfg.reps}`,
      durationMins: cfg.mode === 'duration' ? cfg.duration : 0,
      category: getCategory(name),
      trainingArea: TRAINING_AREAS[name],
      sets: cfg.mode === 'reps' ? parseInt(cfg.sets, 10) || undefined : undefined,
      reps: cfg.mode === 'reps' ? parseInt(cfg.reps, 10) || undefined : undefined,
      weightKg: cfg.mode === 'reps' && cfg.weight ? parseFloat(cfg.weight) || undefined : undefined,
      notes: notes.trim() || undefined,
    }))

    if (passedDateKey) {
      addActivities(passedDateKey, newActivities)
      try {
        await saveActivities(passedDateKey, newActivities)
      } catch {
        // Keep the local optimistic copy; the next retry can sync it once the network returns.
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 160)
    router.back()
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Nav */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
      }}>
        <View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, letterSpacing: -0.4, color: colors.text }}>
            Add activity
          </Text>
          {totalSelected > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>
                {totalSelected} {totalSelected === 1 ? 'activity' : 'activities'} selected
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textFaint }}>·</Text>
              <Zap size={11} color={colors.amber} strokeWidth={2} fill={colors.amber} />
              <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: colors.textMuted }}>{totalCals} kcal</Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back() }}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
            alignItems: 'center', justifyContent: 'center',
            transform: [{ scale: pressed ? 0.9 : 1 }],
          })}
        >
          <X size={16} color={colors.text} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Day selector */}
        <Section label="Day">
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {DAYS.map(d => {
              const active = selectedDays.includes(d)
              return (
                <Pressable
                  key={d}
                  onPress={() => toggleDay(d)}
                  style={{
                    flex: 1, height: 40, borderRadius: 10,
                    backgroundColor: active ? colors.obsidian : colors.surface,
                    borderWidth: 1, borderColor: active ? colors.obsidian : colors.border,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: active ? colors.chalk : colors.textMuted }}>
                    {d}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </Section>

        {/* Equipment groups */}
        <Section label="Training">
          <View style={{ gap: 20 }}>
            {EQUIPMENT_GROUPS.map(group => (
              <View key={group.category}>
                <Text style={{
                  fontFamily: 'DMSans_500Medium', fontSize: 11,
                  color: group.accent, letterSpacing: 0.7,
                  textTransform: 'uppercase', marginBottom: 8,
                }}>
                  {group.category}
                </Text>
                {group.items.map(item => (
                  <EquipmentItem
                    key={item}
                    item={item}
                    accent={group.accent}
                    selected={item in selectedItems}
                    config={selectedItems[item] ?? defaultConfig(item)}
                    onToggle={() => toggleItem(item)}
                    onConfigChange={(patch) => updateItemConfig(item, patch)}
                  />
                ))}
              </View>
            ))}

            {/* Custom items */}
            {customItems.length > 0 && (
              <View>
                <Text style={{
                  fontFamily: 'DMSans_500Medium', fontSize: 11,
                  color: colors.textFaint, letterSpacing: 0.7,
                  textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Other
                </Text>
                {customItems.map(item => (
                  <View key={item} style={{ position: 'relative' }}>
                    <EquipmentItem
                      item={item}
                      accent={colors.textFaint}
                      selected={item in selectedItems}
                      config={selectedItems[item] ?? defaultConfig(item)}
                      onToggle={() => toggleItem(item)}
                      onConfigChange={(patch) => updateItemConfig(item, patch)}
                    />
                    <Pressable
                      onLongPress={() => removeCustomItem(item)}
                      style={{ position: 'absolute', top: 0, right: 0, width: 44, height: 44 }}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Add custom */}
            {showCustomInput ? (
              <View style={{
                flexDirection: 'row', gap: 8, alignItems: 'center',
                backgroundColor: colors.surface, borderRadius: 14,
                borderWidth: 1, borderColor: colors.border,
                paddingHorizontal: 14, paddingVertical: 11,
              }}>
                <TextInput
                  autoFocus
                  value={customInput}
                  onChangeText={setCustomInput}
                  placeholder="e.g. Yoga, Kettlebell, Jump Rope…"
                  placeholderTextColor={colors.textFaint}
                  returnKeyType="done"
                  onSubmitEditing={addCustomItem}
                  style={{ flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.text }}
                />
                <Pressable
                  onPress={addCustomItem}
                  style={({ pressed }) => ({
                    width: 30, height: 30, borderRadius: 15,
                    backgroundColor: customInput.trim() ? colors.text : colors.stone2,
                    alignItems: 'center', justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Check size={13} color={colors.chalk} strokeWidth={2.5} />
                </Pressable>
                <Pressable
                  onPress={() => { setShowCustomInput(false); setCustomInput('') }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
                >
                  <X size={15} color={colors.textFaint} strokeWidth={2} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setShowCustomInput(true)
                }}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, alignSelf: 'flex-start' })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
                  <Plus size={14} color={colors.textMuted} strokeWidth={2.2} />
                  <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted }}>Add other training</Text>
                </View>
              </Pressable>
            )}
          </View>
        </Section>

        {/* Notes */}
        <Section label="Notes (optional)">
          <View style={{
            backgroundColor: colors.surface, borderRadius: 14,
            borderWidth: 1, borderColor: colors.border,
            padding: 14, minHeight: 80,
          }}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Focus on form, increase weight next week…"
              placeholderTextColor={colors.textFaint}
              multiline
              style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.text, lineHeight: 22 }}
            />
          </View>
        </Section>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1, marginTop: 8 })}
        >
          <View style={{ height: 56, width: '100%', borderRadius: 16, backgroundColor: canSave ? colors.text : colors.stone2, alignItems: 'center', justifyContent: 'center', gap: 6, flexDirection: 'row' }}>
            {canSave && totalCals > 0 && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}><Zap size={13} color={colors.amber} strokeWidth={2} fill={colors.amber} /><Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 13, color: colors.amber }}>{totalCals} kcal</Text></View>}
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, letterSpacing: -0.32, color: canSave ? colors.chalk : colors.textMuted }}>{canSave ? `Save ${totalSelected} ${totalSelected === 1 ? 'activity' : 'activities'}` : 'Select training first'}</Text>
          </View>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors()
  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.text, marginBottom: 12 }}>
        {label}
      </Text>
      {children}
    </View>
  )
}
