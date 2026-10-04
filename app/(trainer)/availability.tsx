import { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Plus, Trash2 } from 'lucide-react-native'
import { colors } from '@/lib/theme/colors'
import { WCard } from '@/components/ui/WCard'
import { WInput } from '@/components/ui/WInput'
import { WButton } from '@/components/ui/WButton'
import { useAuthStore } from '@/lib/stores/authStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatDate } from '@/lib/utils/formatDate'
import { TimeBlock } from '@/types/database'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const BLOCKS: TimeBlock[] = ['morning', 'afternoon', 'evening']
const BLOCK_LABELS: Record<TimeBlock, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' }

interface DayRow {
  dayOfWeek: number
  isAvailable: boolean
  timeBlocks: TimeBlock[]
}

interface BlockedDate {
  id: string
  startDate: string
  endDate: string
  reason: string | null
}

export default function TrainerAvailabilityScreen() {
  const user = useAuthStore((s) => s.user)
  const [trainerId, setTrainerId] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [days, setDays] = useState<DayRow[]>(DAYS.map((_, i) => ({ dayOfWeek: i, isAvailable: false, timeBlocks: [] })))
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [togglingPause, setTogglingPause] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [blockStart, setBlockStart] = useState('')
  const [blockEnd, setBlockEnd] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [savingBlock, setSavingBlock] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data: profile, error: profileError } = await supabase
        .from('trainer_profiles')
        .select('id, availability_paused')
        .eq('user_id', user.id)
        .maybeSingle()
      if (profileError) throw profileError
      const tid = profile?.id ?? null
      setTrainerId(tid)
      setPaused(profile?.availability_paused ?? false)
      if (!tid) return

      const [availRes, blockedRes] = await Promise.all([
        supabase.from('trainer_availability').select('day_of_week, is_available, time_blocks').eq('trainer_id', tid),
        supabase.from('trainer_blocked_dates').select('id, start_date, end_date, reason').eq('trainer_id', tid).order('start_date', { ascending: true }),
      ])
      if (availRes.error) throw availRes.error
      if (blockedRes.error) throw blockedRes.error

      const rows = DAYS.map((_, i) => {
        const found = (availRes.data ?? []).find((r) => r.day_of_week === i)
        return {
          dayOfWeek: i,
          isAvailable: found?.is_available ?? false,
          timeBlocks: (found?.time_blocks as TimeBlock[] | null) ?? [],
        }
      })
      setDays(rows)
      setBlockedDates((blockedRes.data ?? []).map((b) => ({ id: b.id, startDate: b.start_date, endDate: b.end_date, reason: b.reason })))
    } catch (err) {
      logger.error('trainerDashboard', 'fetchAvailability', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function handleTogglePause() {
    if (!trainerId) return
    try {
      setTogglingPause(true)
      const newPaused = !paused
      const { error } = await supabase.from('trainer_profiles').update({ availability_paused: newPaused }).eq('id', trainerId)
      if (error) throw error
      setPaused(newPaused)
    } catch (err) {
      logger.error('trainerDashboard', 'toggleAvailabilityPause', err)
      Alert.alert('Error', 'Could not update your availability status.')
    } finally {
      setTogglingPause(false)
    }
  }

  function toggleDayAvailable(dayOfWeek: number) {
    setDays((prev) => prev.map((d) => d.dayOfWeek === dayOfWeek ? { ...d, isAvailable: !d.isAvailable } : d))
  }

  function toggleBlock(dayOfWeek: number, block: TimeBlock) {
    setDays((prev) => prev.map((d) => {
      if (d.dayOfWeek !== dayOfWeek) return d
      const has = d.timeBlocks.includes(block)
      return { ...d, timeBlocks: has ? d.timeBlocks.filter((b) => b !== block) : [...d.timeBlocks, block] }
    }))
  }

  async function handleSaveHours() {
    if (!trainerId) return
    try {
      setSaving(true)
      const rows = days.map((d) => ({
        trainer_id: trainerId,
        day_of_week: d.dayOfWeek,
        is_available: d.isAvailable,
        time_blocks: d.timeBlocks,
      }))
      const { error } = await supabase.from('trainer_availability').upsert(rows, { onConflict: 'trainer_id,day_of_week' })
      if (error) throw error
      Alert.alert('Saved', 'Working hours updated.')
    } catch (err) {
      logger.error('trainerDashboard', 'saveWorkingHours', err)
      Alert.alert('Error', 'Could not save your working hours.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddBlockedDate() {
    if (!trainerId) return
    if (!blockStart.trim() || !blockEnd.trim()) {
      Alert.alert('Missing fields', 'Enter a start and end date (YYYY-MM-DD).')
      return
    }
    try {
      setSavingBlock(true)
      const { error } = await supabase.from('trainer_blocked_dates').insert({
        trainer_id: trainerId,
        start_date: blockStart.trim(),
        end_date: blockEnd.trim(),
        reason: blockReason.trim() || null,
      })
      if (error) throw error
      setBlockStart('')
      setBlockEnd('')
      setBlockReason('')
      setAddModalOpen(false)
      await load()
    } catch (err) {
      logger.error('trainerDashboard', 'addBlockedDate', err)
      Alert.alert('Error', 'Could not add this blocked date.')
    } finally {
      setSavingBlock(false)
    }
  }

  async function handleRemoveBlockedDate(id: string) {
    try {
      const { error } = await supabase.from('trainer_blocked_dates').delete().eq('id', id)
      if (error) throw error
      setBlockedDates((prev) => prev.filter((b) => b.id !== id))
    } catch (err) {
      logger.error('trainerDashboard', 'removeBlockedDate', err)
      Alert.alert('Error', 'Could not remove this blocked date.')
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.green} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 }}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, color: colors.text, letterSpacing: -0.5 }}>Availability</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {/* Pause toggle */}
        <WCard style={{ marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 15, color: colors.text }}>
              {paused ? 'Bookings paused' : 'Accepting bookings'}
            </Text>
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              {paused ? 'Members cannot book new sessions.' : 'Members can book sessions with you.'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleTogglePause}
            disabled={togglingPause}
            hitSlop={8}
            style={{
              width: 46, height: 26, borderRadius: 13,
              backgroundColor: !paused ? colors.green : colors.border,
              justifyContent: 'center',
              opacity: togglingPause ? 0.6 : 1,
            }}
          >
            <View style={{
              width: 20, height: 20, borderRadius: 10,
              backgroundColor: colors.white,
              marginLeft: !paused ? 22 : 3,
            }} />
          </TouchableOpacity>
        </WCard>

        {/* Working hours */}
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text, marginBottom: 12 }}>
          Working hours
        </Text>
        <View style={{ gap: 10, marginBottom: 20 }}>
          {days.map((day) => (
            <WCard key={day.dayOfWeek} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: day.isAvailable ? 12 : 0 }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>{DAYS[day.dayOfWeek]}</Text>
                <TouchableOpacity
                  onPress={() => toggleDayAvailable(day.dayOfWeek)}
                  hitSlop={8}
                  style={{
                    width: 40, height: 24, borderRadius: 12,
                    backgroundColor: day.isAvailable ? colors.green : colors.border,
                    justifyContent: 'center',
                  }}
                >
                  <View style={{
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: colors.white,
                    marginLeft: day.isAvailable ? 19 : 3,
                  }} />
                </TouchableOpacity>
              </View>
              {day.isAvailable && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {BLOCKS.map((block) => {
                    const active = day.timeBlocks.includes(block)
                    return (
                      <TouchableOpacity
                        key={block}
                        onPress={() => toggleBlock(day.dayOfWeek, block)}
                        style={{
                          flex: 1, paddingVertical: 8, borderRadius: 8,
                          alignItems: 'center',
                          backgroundColor: active ? colors.obsidian : colors.stone2,
                        }}
                      >
                        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: active ? colors.white : colors.textMuted }}>
                          {BLOCK_LABELS[block]}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </WCard>
          ))}
        </View>
        <WButton label="Save working hours" variant="green" onPress={handleSaveHours} loading={saving} style={{ marginBottom: 32 }} />

        {/* Blocked dates */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.text }}>Blocked dates</Text>
          <TouchableOpacity
            onPress={() => setAddModalOpen(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Plus size={16} color={colors.green} strokeWidth={2.5} />
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: colors.green }}>Add</Text>
          </TouchableOpacity>
        </View>

        <WCard style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          {blockedDates.length === 0 ? (
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 12 }}>
              No blocked dates. Add a range to mark yourself unavailable (e.g. vacation).
            </Text>
          ) : (
            blockedDates.map((b, i) => (
              <View
                key={b.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>
                    {formatDate(b.startDate)} – {formatDate(b.endDate)}
                  </Text>
                  {b.reason && (
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {b.reason}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleRemoveBlockedDate(b.id)} hitSlop={8}>
                  <Trash2 size={16} color={colors.ember} strokeWidth={1.8} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </WCard>
      </ScrollView>

      <Modal visible={addModalOpen} animationType="slide" onRequestClose={() => setAddModalOpen(false)} transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.text, marginBottom: 16 }}>
              Block dates
            </Text>
            <View style={{ gap: 14 }}>
              <WInput label="Start date (YYYY-MM-DD)" value={blockStart} onChangeText={setBlockStart} placeholder="2026-08-01" />
              <WInput label="End date (YYYY-MM-DD)" value={blockEnd} onChangeText={setBlockEnd} placeholder="2026-08-10" />
              <WInput label="Reason (optional)" value={blockReason} onChangeText={setBlockReason} placeholder="e.g. Vacation" />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <WButton
                  label="Cancel"
                  variant="dark"
                  onPress={() => setAddModalOpen(false)}
                  style={{ flex: 1, backgroundColor: colors.surface }}
                />
                <WButton label="Add" variant="green" onPress={handleAddBlockedDate} loading={savingBlock} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
