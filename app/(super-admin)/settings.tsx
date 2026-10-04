import { useCallback, useState } from 'react'
import { View, Text, ScrollView, Pressable, Modal, ActivityIndicator } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ChevronRight, Sun, LogOut, LifeBuoy, X } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { formatDate } from '@/lib/utils/formatDate'
import { WBadge } from '@/components/ui/WBadge'
import { LogoutOverlay } from '@/components/shared/LogoutOverlay'
import { AppearanceSheet } from '@/components/shared/AppearanceSheet'
import type { TicketStatus } from '@/types/database'

interface Ticket {
  id: string
  subject: string
  message: string
  status: TicketStatus
  createdAt: string
  submittedBy: string
  submitterName: string
}

const TICKET_BADGE_VARIANT: Record<TicketStatus, 'green' | 'amber' | 'ember' | 'slate'> = {
  open: 'amber',
  in_progress: 'slate',
  resolved: 'green',
  closed: 'slate',
}

function statusLabel(status: TicketStatus) {
  return status.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function SuperAdminSettingsScreen() {
  const colors = useColors()
  const { signOut } = useAuth()
  const [showLogout, setShowLogout] = useState(false)
  const [showAppearance, setShowAppearance] = useState(false)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, subject, message, status, created_at, submitted_by')
        .order('created_at', { ascending: false })
      if (error) throw error

      const rows = data ?? []
      const userIds = Array.from(new Set(rows.map((t) => t.submitted_by)))
      let namesById: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds)
        if (usersError) throw usersError
        namesById = Object.fromEntries((usersData ?? []).map((u) => [u.id, u.full_name]))
      }

      setTickets(rows.map((t) => ({
        id: t.id,
        subject: t.subject,
        message: t.message,
        status: t.status as TicketStatus,
        createdAt: t.created_at ?? new Date(0).toISOString(),
        submittedBy: t.submitted_by,
        submitterName: namesById[t.submitted_by] || 'Unknown',
      })))
    } catch (err) {
      logger.error('superAdmin', 'fetchSupportTickets', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  async function handleUpdateStatus(ticket: Ticket, status: TicketStatus) {
    setUpdatingStatus(true)
    try {
      const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticket.id)
      if (error) throw error
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? { ...t, status } : t)))
      setSelectedTicket((prev) => (prev && prev.id === ticket.id ? { ...prev, status } : prev))
    } catch (err) {
      logger.error('superAdmin', 'updateTicketStatus', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const openCount = tickets.filter((t) => t.status === 'open').length

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 28, color: colors.white, marginBottom: 20 }}>Settings</Text>

        {/* ── Appearance ── */}
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, letterSpacing: 0.7, color: colors.slate, textTransform: 'uppercase', marginBottom: 8 }}>
          Appearance
        </Text>
        <View style={{ backgroundColor: colors.adminSurface, borderRadius: 18, borderWidth: 1, borderColor: colors.adminBorder, overflow: 'hidden', marginBottom: 28 }}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAppearance(true) }}
            style={({ pressed }) => ({
              paddingHorizontal: 16, paddingVertical: 15,
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: pressed ? colors.stone2 : colors.adminSurface,
            })}
          >
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.stone2, alignItems: 'center', justifyContent: 'center' }}>
              <Sun size={16} color={colors.slate} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.white }}>Theme</Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate, marginTop: 1 }}>System · Light · Dark</Text>
            </View>
            <ChevronRight size={15} color={colors.slate} strokeWidth={2} />
          </Pressable>
        </View>

        {/* ── Support tickets ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, letterSpacing: 0.7, color: colors.slate, textTransform: 'uppercase' }}>
            Support tickets
          </Text>
          {!loading && openCount > 0 && (
            <View style={{ backgroundColor: '#1A1200', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 11, color: colors.amber }}>{openCount} open</Text>
            </View>
          )}
        </View>

        <View style={{ backgroundColor: colors.adminSurface, borderRadius: 18, borderWidth: 1, borderColor: colors.adminBorder, overflow: 'hidden', marginBottom: 28 }}>
          {loading ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={colors.green} />
            </View>
          ) : tickets.length === 0 ? (
            <View style={{ paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center' }}>
              <LifeBuoy size={22} color={colors.slate} strokeWidth={1.75} />
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: colors.slate, marginTop: 8, textAlign: 'center' }}>
                No support tickets yet.
              </Text>
            </View>
          ) : (
            tickets.map((ticket, i) => (
              <Pressable
                key={ticket.id}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedTicket(ticket) }}
                style={({ pressed }) => ({
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.adminBorder,
                  backgroundColor: pressed ? colors.stone2 : colors.adminSurface,
                })}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.white }} numberOfLines={1}>
                      {ticket.subject}
                    </Text>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate, marginTop: 2 }}>
                      {ticket.submitterName} · {formatDate(ticket.createdAt)}
                    </Text>
                  </View>
                  <WBadge label={statusLabel(ticket.status)} variant={TICKET_BADGE_VARIANT[ticket.status]} />
                </View>
              </Pressable>
            ))
          )}
        </View>

        {/* ── Logout ── */}
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowLogout(true) }}
          style={({ pressed }) => ({
            height: 52, borderRadius: 14,
            borderWidth: 1, borderColor: `${colors.ember}28`,
            alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: 8,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <LogOut size={16} color={colors.ember} strokeWidth={2} />
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.ember }}>Log out</Text>
        </Pressable>
      </ScrollView>

      <LogoutOverlay
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={() => { setShowLogout(false); signOut() }}
      />

      <AppearanceSheet visible={showAppearance} onClose={() => setShowAppearance(false)} />

      {/* ── Ticket detail modal ── */}
      <Modal transparent animationType="fade" visible={!!selectedTicket} onRequestClose={() => setSelectedTicket(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setSelectedTicket(null)} />
          {selectedTicket && (
            <View style={{ backgroundColor: colors.adminSurface, borderRadius: 20, borderWidth: 1, borderColor: colors.adminBorder, padding: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, color: colors.white, flex: 1, marginRight: 12 }}>
                  {selectedTicket.subject}
                </Text>
                <Pressable onPress={() => setSelectedTicket(null)} hitSlop={12}>
                  <X size={20} color={colors.slate} strokeWidth={2} />
                </Pressable>
              </View>

              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.slate, marginBottom: 12 }}>
                {selectedTicket.submitterName} · {formatDate(selectedTicket.createdAt)}
              </Text>

              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.white, lineHeight: 20, marginBottom: 20 }}>
                {selectedTicket.message}
              </Text>

              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, letterSpacing: 0.7, color: colors.slate, textTransform: 'uppercase', marginBottom: 8 }}>
                Status
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map((status) => {
                  const active = selectedTicket.status === status
                  return (
                    <Pressable
                      key={status}
                      disabled={updatingStatus}
                      onPress={() => handleUpdateStatus(selectedTicket, status)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                        borderWidth: 1.5, borderColor: active ? colors.green : colors.adminBorder,
                        backgroundColor: active ? '#001A0D' : 'transparent',
                        opacity: updatingStatus ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: active ? colors.green : colors.slate }}>
                        {statusLabel(status)}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  )
}
