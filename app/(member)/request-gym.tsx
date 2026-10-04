import { useEffect, useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import * as Location from 'expo-location'
import { ArrowLeft, Send } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { supabase } from '@/lib/supabase'
import { GymLocationMap, type GymMapRegion } from '@/components/shared/GymLocationMap'

const DEFAULT_REGION: GymMapRegion = { latitude: 6.5244, longitude: 3.3792, latitudeDelta: 0.08, longitudeDelta: 0.08 }

export default function RequestGymScreen() {
  const c = useColors()
  const [region, setRegion] = useState(DEFAULT_REGION)
  const [gymName, setGymName] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(({ coords }) => setRegion((r) => ({ ...r, latitude: coords.latitude, longitude: coords.longitude })))
      .catch(() => undefined)
  }, [])

  async function submit() {
    const name = gymName.trim()
    if (!name) { Alert.alert('Gym name needed', 'Add the name so our team can find it.'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in again.')
      // This table is introduced by the accompanying migration. Until the
      // linked project has applied it and types are regenerated, keep this
      // boundary narrow rather than weakening the rest of the Supabase client.
      const requests = (supabase as any).from('member_gym_requests')
      const { error } = await requests.insert({
        member_id: user.id,
        gym_name: name,
        address_label: address.trim() || null,
        latitude: region.latitude,
        longitude: region.longitude,
        member_note: note.trim() || null,
      })
      if (error) throw error
      Alert.alert('Request sent', 'We saved the location and will let you know when the gym is added.', [{ text: 'Done', onPress: () => router.back() }])
    } catch (e) {
      Alert.alert('Could not send request', e instanceof Error ? e.message : 'Please try again.')
    } finally { setSaving(false) }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
          <Text style={[styles.title, { color: c.text }]}>Request a gym</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>Can’t find your gym? Drop its location and we’ll add it to the directory.</Text>
        <TextInput value={gymName} onChangeText={setGymName} placeholder="Gym name" placeholderTextColor={c.textMuted} style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]} />
        <TextInput value={address} onChangeText={setAddress} placeholder="Address or area (optional)" placeholderTextColor={c.textMuted} style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]} />
        <Text style={[styles.label, { color: c.textMuted }]}>Drag the pin to the gym</Text>
        <View style={styles.mapWrap}>
          <GymLocationMap region={region} onChange={setRegion} />
        </View>
        <TextInput value={note} onChangeText={setNote} placeholder="Anything else to help us? (optional)" placeholderTextColor={c.textMuted} multiline style={[styles.note, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]} />
        <Pressable disabled={saving} onPress={submit} style={({ pressed }) => [styles.submit, { backgroundColor: c.green, opacity: saving ? 0.6 : pressed ? 0.82 : 1 }]}>
          <Send size={17} color="#07120D" /><Text style={styles.submitText}>{saving ? 'Sending…' : 'Send request'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 58, paddingBottom: 38 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 21, letterSpacing: -0.4 },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, marginBottom: 20 },
  input: { height: 50, borderWidth: 1, borderRadius: 13, paddingHorizontal: 15, fontFamily: 'DMSans_400Regular', fontSize: 14, marginBottom: 11 },
  label: { fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 8, marginBottom: 8 },
  mapWrap: { height: 270, borderRadius: 18, overflow: 'hidden', marginBottom: 14 },
  note: { minHeight: 76, borderWidth: 1, borderRadius: 13, padding: 14, textAlignVertical: 'top', fontFamily: 'DMSans_400Regular', fontSize: 14, marginBottom: 16 },
  submit: { height: 52, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#07120D' },
})
