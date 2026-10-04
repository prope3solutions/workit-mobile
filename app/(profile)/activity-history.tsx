import { useMemo } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, CalendarCheck, Dumbbell, Flame, Timer } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { useCheckIns } from '@/lib/hooks/useCheckIns'
import { useMembership } from '@/lib/hooks/useMembership'
import { useWorkoutPlan } from '@/lib/hooks/useWorkoutPlan'

export default function ActivityHistoryScreen() {
  const colors = useColors()
  const { membership } = useMembership()
  const { checkIns, loading: checkinsLoading } = useCheckIns(membership?.gymId, membership?.id)
  const { activities, loading: workoutsLoading } = useWorkoutPlan()
  const workoutCount = useMemo(() => Object.values(activities).reduce((sum, day) => sum + day.length, 0), [activities])
  const minutes = useMemo(() => Object.values(activities).flat().reduce((sum, item) => sum + item.durationMins, 0), [activities])
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 58, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}><Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={21} color={colors.text} /></Pressable><Text style={{ fontFamily: 'Syne_700Bold', fontSize: 24, color: colors.text }}>Activity History</Text></View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[{ icon: CalendarCheck, value: checkIns.length, label: 'Check-ins' }, { icon: Dumbbell, value: workoutCount, label: 'Activities' }, { icon: Timer, value: `${minutes}m`, label: 'Time trained' }].map(({ icon: Icon, value, label }) => <View key={label} style={{ flex: 1, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}><Icon size={17} color={colors.greenDeep} /><Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.text, marginTop: 10 }}>{value}</Text><Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textMuted, marginTop: 3 }}>{label}</Text></View>)}
        </View>
        <View style={{ padding: 18, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, color: colors.text, marginBottom: 14 }}>Recent check-ins</Text>
          {checkinsLoading || workoutsLoading ? <ActivityIndicator color={colors.green} style={{ padding: 20 }} /> : checkIns.length === 0 ? <Text style={{ fontFamily: 'DMSans_400Regular', color: colors.textMuted }}>No check-ins yet.</Text> : checkIns.slice(0, 10).map((checkIn) => <View key={checkIn.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }}><CalendarCheck size={16} color={colors.greenDeep} /><Text style={{ fontFamily: 'DMSans_400Regular', color: colors.text }}>{new Date(checkIn.checkedInAt).toLocaleString()}</Text></View>)}
        </View>
      </ScrollView>
    </View>
  )
}
