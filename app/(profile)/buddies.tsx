import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { router } from 'expo-router'
import { ArrowLeft, Heart, UserPlus } from 'lucide-react-native'
import { Avatar } from '@/components/shared/Avatar'
import { supabase } from '@/lib/supabase'
import { useColors } from '@/lib/theme/colors'
import { logger } from '@/lib/logger'
import { useConnections } from '@/lib/hooks/useConnections'

type Buddy = { member_id: string; full_name: string; nickname: string | null; avatar_url: string | null }

export default function BuddiesScreen() {
  const colors = useColors()
  const [buddies, setBuddies] = useState<Buddy[]>([])
  const [loading, setLoading] = useState(true)
  const { requests, respondConnection } = useConnections()

  useEffect(() => {
    supabase.rpc('get_my_buddies').then(({ data, error }) => {
      if (error) logger.error('buddies', 'load', error)
      setBuddies(data ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: 58, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ArrowLeft size={21} color={colors.text} /></Pressable>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 24, color: colors.text }}>My Buddies</Text>
      </View>
      {loading ? <ActivityIndicator color={colors.green} style={{ marginTop: 50 }} /> : null}
      {!loading && buddies.length === 0 ? (
        <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingTop: 70 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}><UserPlus size={28} color={colors.textMuted} /></View>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.text, textAlign: 'center', marginBottom: 8 }}>No buddies yet</Text>
          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21, color: colors.textMuted, textAlign: 'center' }}>Connect with people from your gym to build accountability together.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
          {buddies.map((buddy) => <View key={buddy.member_id} style={{ minHeight: 68, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Avatar uri={buddy.avatar_url} name={buddy.full_name} size={40} /><View><Text style={{ fontFamily: 'DMSans_500Medium', color: colors.text }}>{buddy.full_name}</Text><Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>{buddy.nickname ? `@${buddy.nickname}` : 'WorkIt member'}</Text></View><Heart size={17} color={colors.greenDeep} fill={colors.greenDeep} style={{ marginLeft: 'auto' }} /></View>)}
        </ScrollView>
      )}
      {requests.length > 0 ? (
        <View style={{ paddingHorizontal: 20, paddingBottom: 24, gap: 8 }}>
          <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 17, color: colors.text }}>Connection requests</Text>
          {requests.map((request) => (
            <View key={request.id} style={{ padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textMuted }}>Member {request.requester_id.slice(0, 8)} wants to connect</Text>
              <Pressable onPress={() => respondConnection(request.id, 'declined')} hitSlop={8}><Text style={{ color: colors.textMuted, fontFamily: 'DMSans_500Medium', fontSize: 12 }}>Decline</Text></Pressable>
              <Pressable onPress={() => respondConnection(request.id, 'accepted')} hitSlop={8}><Text style={{ color: colors.greenDeep, fontFamily: 'DMSans_500Medium', fontSize: 12 }}>Accept</Text></Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
