import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Check, Target, Weight } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { useWeightStore, goalProgress, estimatedWeight } from '@/lib/stores/weightStore'

export default function GoalsScreen() {
  const colors = useColors()
  const { currentWeight, dreamWeight, sessionsCompleted, setGoal } = useWeightStore()
  const [current, setCurrent] = useState(currentWeight?.toString() ?? '')
  const [dream, setDream] = useState(dreamWeight?.toString() ?? '')
  const progress = goalProgress(sessionsCompleted)
  const save = () => {
    const currentValue = Number(current)
    const dreamValue = Number(dream)
    if (currentValue > 0 && dreamValue > 0) setGoal(currentValue, dreamValue)
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 58, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={21} color={colors.text} /></Pressable>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 24, color: colors.text }}>Goals</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        <View style={{ padding: 18, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}><Weight size={19} color={colors.greenDeep} /><Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, color: colors.text }}>Weight goal</Text></View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>CURRENT (KG)</Text><View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 13 }}><TextInput value={current} onChangeText={setCurrent} keyboardType="decimal-pad" placeholder="72.5" placeholderTextColor={colors.textFaint} style={{ color: colors.text, fontFamily: 'DMMono_400Regular', height: 46 }} /></View></View>
            <View style={{ flex: 1 }}><Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>GOAL (KG)</Text><View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 13 }}><TextInput value={dream} onChangeText={setDream} keyboardType="decimal-pad" placeholder="68" placeholderTextColor={colors.textFaint} style={{ color: colors.text, fontFamily: 'DMMono_400Regular', height: 46 }} /></View></View>
          </View>
          <Pressable onPress={save} style={{ marginTop: 14, height: 48, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontFamily: 'Syne_700Bold', color: colors.obsidian }}>Save goal</Text></Pressable>
        </View>
        <View style={{ padding: 18, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}><Target size={19} color={colors.amber} /><Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, color: colors.text }}>Workout consistency</Text></View>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>Keep showing up to build your training habit.</Text>
          <View style={{ height: 7, backgroundColor: colors.surface2, borderRadius: 99, overflow: 'hidden' }}><View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.green, borderRadius: 99 }} /></View>
          <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: colors.textMuted, marginTop: 8 }}>{sessionsCompleted} sessions completed {currentWeight && dreamWeight ? `· estimated ${estimatedWeight(currentWeight, dreamWeight, sessionsCompleted)} kg` : ''}</Text>
        </View>
      </ScrollView>
    </View>
  )
}
