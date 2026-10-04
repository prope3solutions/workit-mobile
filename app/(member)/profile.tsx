import React, { useRef, useState } from 'react'
import {
  View, Text, ScrollView, Pressable,
  Modal, Animated, Dimensions, StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import {
  ChevronRight, LogOut, Dumbbell, Settings2,
  Shield, CreditCard, Heart, Sun, Target, History, Trash2,
} from 'lucide-react-native'
import { Image } from 'expo-image'
import { useAuth } from '@/lib/hooks/useAuth'
import { useMembership } from '@/lib/hooks/useMembership'
import { formatDateLong } from '@/lib/utils/formatDate'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'
import { AppearanceSheet } from '@/components/shared/AppearanceSheet'
import { supabase } from '@/lib/supabase'
import Svg, { Line, Circle } from 'react-native-svg'

const { height: SCREEN_H } = Dimensions.get('window')

const styles = StyleSheet.create({
  screenContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  menuGroup: {
    width: '100%',
    alignSelf: 'stretch',
  },
  menuPressable: {
    width: '100%',
    minHeight: 72,
  },
  menuRow: {
    width: '100%',
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  insetDivider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  accountAction: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

function AvatarCardGrid({ width, height }: { width: number; height: number }) {
  const step = 24
  const lines: React.ReactElement[] = []
  for (let x = step; x < width; x += step)
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />)
  for (let y = step; y < height; y += step)
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />)
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, borderRadius: 22 }}>
      {lines}
      <Circle cx={width * 0.85} cy={-10} r={70} fill="rgba(0,232,122,0.07)" />
    </Svg>
  )
}

// ── Logout overlay ────────────────────────────────────────────────────────────
function LogoutOverlay({ visible, onCancel, onConfirm }: {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const c = useColors()
  const sheetY = useRef(new Animated.Value(300)).current
  const backdropOp = useRef(new Animated.Value(0)).current
  const btnScale = useRef(new Animated.Value(1)).current

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: native, speed: 22, bounciness: 4 }),
        Animated.timing(backdropOp, { toValue: 1, duration: 200, useNativeDriver: native }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(sheetY, { toValue: 300, duration: 220, useNativeDriver: native }),
        Animated.timing(backdropOp, { toValue: 0, duration: 180, useNativeDriver: native }),
      ]).start()
    }
  }, [visible])

  if (!visible) return null

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onCancel}>
      {/* Backdrop */}
      <Animated.View
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOp }}
      >
        <Pressable style={{ flex: 1 }} onPress={onCancel} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: c.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40,
        transform: [{ translateY: sheetY }],
      }}>
        {/* Pull handle */}
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 28 }} />

        {/* Icon */}
        <View style={{
          width: 56, height: 56, borderRadius: 18,
          backgroundColor: `${c.ember}14`,
          alignItems: 'center', justifyContent: 'center',
          alignSelf: 'center', marginBottom: 16,
        }}>
          <LogOut size={24} color={c.ember} strokeWidth={2} />
        </View>

        <Text style={{
          fontFamily: 'Syne_700Bold', fontSize: 20,
          letterSpacing: -0.4, color: c.text,
          textAlign: 'center', marginBottom: 8,
        }}>
          Log out?
        </Text>
        <Text style={{
          fontFamily: 'DMSans_400Regular', fontSize: 14,
          color: c.textMuted, textAlign: 'center',
          lineHeight: 21, marginBottom: 32,
        }}>
          You'll need to sign in again to access your account and memberships.
        </Text>

        {/* Confirm */}
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            onPress={onConfirm}
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: native, speed: 50, bounciness: 0 }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: native, speed: 30, bounciness: 4 }).start()}
            style={{
              height: 54, borderRadius: 16,
              backgroundColor: c.ember,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: '#FFFFFF' }}>Yes, log me out</Text>
          </Pressable>
        </Animated.View>

        {/* Cancel */}
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.7 : 1 })}
        >
          <View style={{ width: '100%', minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: c.textMuted }}>Cancel</Text>
          </View>
        </Pressable>
      </Animated.View>
    </Modal>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────
type MenuItem = {
  label: string
  sub?: string
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>
  onPress: () => void
  danger?: boolean
  right?: React.ReactNode
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const c = useColors()
  const insets = useSafeAreaInsets()
  const { membership } = useMembership()
  const [showLogout, setShowLogout] = useState(false)
  const [showAppearance, setShowAppearance] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  function confirmDeleteAccount() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    Alert.alert(
      'Delete your account?',
      'This will sign you out and queue your account and personal data for permanent deletion. This action cannot be undone once processed.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true)
            const { error } = await (supabase.rpc as any)('request_account_deletion')
            if (error) {
              setDeletingAccount(false)
              Alert.alert('Could not request deletion', error.message ?? 'Please try again.')
              return
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            await signOut()
          },
        },
      ]
    )
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'ME'

  // Membership row only appears if the member has (or had) a membership.
  const isExpired = membership?.displayStatus === 'expired'
  const isCancelled = membership?.displayStatus === 'cancelled'
  const statusColor = isExpired ? c.ember : c.greenDeep
  const statusBg = isExpired ? `${c.ember}20` : `${c.green}20`
  const statusLabel = isExpired ? 'Expired' : isCancelled ? 'Cancelled' : 'Active'

  const membershipItems: MenuItem[] = [
    ...(membership
      ? [{
          label: membership.gymName,
          sub: `${membership.planName} · ${isExpired ? 'Expired' : 'Expires'} ${formatDateLong(membership.endDate)}`,
          icon: Dumbbell,
          // Non-interactive — this row just displays the member's current membership
          // status (Active/Expired). It shows only when a membership exists; the whole
          // 'My memberships' section is absent otherwise (handled by the membership check).
          onPress: () => {},
          right: (
            <View style={{ backgroundColor: statusBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: statusColor }}>{statusLabel}</Text>
            </View>
          ),
        } as MenuItem]
      : []),
    {
      label: 'Saved gyms',
      sub: 'Your watchlist',
      icon: Heart,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        router.push('/(profile)/saved-gyms')
      },
    },
  ]

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Community',
      items: [{
        label: 'My Buddies',
        sub: 'People you connect and train with',
        icon: Heart,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          router.push('/(profile)/buddies')
        },
      }],
    },
    {
      title: 'My memberships',
      items: membershipItems,
    },
    {
      title: 'Progress',
      items: [
        {
          label: 'Goals',
          sub: 'Weight, workouts and consistency',
          icon: Target,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            router.push('/(profile)/goals')
          },
        },
        {
          label: 'Activity history',
          sub: 'Your check-ins and workouts',
          icon: History,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            router.push('/(profile)/activity-history')
          },
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          label: 'Payment methods',
          sub: 'Cards & billing',
          icon: CreditCard,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            router.push('/(profile)/payment-methods')
          },
        },
        {
          label: 'Notifications',
          // Settings gear (not the plain bell) so this reads as notification *settings*,
          // distinct from the bell in the header that opens the notifications inbox.
          sub: 'Email · Push',
          icon: Settings2,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            router.push('/(profile)/notifications')
          },
        },
        {
          label: 'Password & security',
          icon: Shield,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            router.push('/(profile)/security')
          },
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          label: 'Appearance',
          sub: 'Theme · dark mode',
          icon: Sun,
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            setShowAppearance(true)
          },
        },
      ],
    },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={[styles.screenContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: 'Syne_700Bold', fontSize: 26, letterSpacing: -0.52, color: c.text, marginBottom: 20 }}>
          Profile
        </Text>

        {/* ── Avatar card ── */}
        <View style={{
          backgroundColor: c.obsidian, borderRadius: 22,
          padding: 20, marginBottom: 28, overflow: 'hidden',
        }}>
          <AvatarCardGrid width={340} height={100} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={{ width: 58, height: 58, borderRadius: 18 }}
                contentFit="cover"
              />
            ) : (
              <View style={{
                width: 58, height: 58, borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.07)',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
              }}>
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: c.green }}>
                  {initials}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 18, letterSpacing: -0.36, color: c.chalk }}>
                {user?.full_name ?? 'Your Name'}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(245,245,240,0.42)', marginTop: 2 }}>
                {user?.email ?? 'email@example.com'}
              </Text>
            </View>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                router.push('/(profile)/edit-profile')
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
                transform: [{ scale: pressed ? 0.94 : 1 }],
              })}
            >
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: c.chalk }}>Edit</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Menu sections ── */}
        {sections.map((section) => (
          <View key={section.title} style={{ marginBottom: 24 }}>
            <Text style={{
              fontFamily: 'DMSans_500Medium', fontSize: 11,
              letterSpacing: 0.7, color: c.textMuted,
              textTransform: 'uppercase', marginBottom: 8,
            }}>
              {section.title}
            </Text>
            <View style={[styles.menuGroup, {
              backgroundColor: c.surface, borderRadius: 18,
              borderWidth: 1, borderColor: c.border, overflow: 'hidden',
            }]}>
              {section.items.map((item, i) => {
                const Icon = item.icon
                return (
                  <React.Fragment key={item.label}>
                    {i > 0 ? <View style={[styles.insetDivider, { backgroundColor: c.border }]} /> : null}
                    <Pressable
                    onPress={item.onPress}
                    style={({ pressed }) => ([styles.menuPressable, {
                      backgroundColor: pressed ? c.stone2 : c.surface,
                    }])}
                  >
                    {/* Keep the structural row outside Pressable's state style. This is
                        explicit on native and prevents adjacent rows from collapsing or
                        their trailing content stretching across the card. */}
                    <View style={styles.menuRow}>
                      <View style={{
                        width: 34, height: 34, borderRadius: 10, marginRight: 12,
                        flexGrow: 0, flexShrink: 0,
                        backgroundColor: c.stone2,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={16} color={item.danger ? c.ember : c.textMuted} strokeWidth={1.75} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                        <Text
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.15}
                          style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: item.danger ? c.ember : c.text }}
                        >
                          {item.label}
                        </Text>
                        {item.sub && (
                          <Text
                            numberOfLines={2}
                            maxFontSizeMultiplier={1.15}
                            style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 16, color: c.textMuted, marginTop: 1 }}
                          >
                            {item.sub}
                          </Text>
                        )}
                      </View>
                      <View style={{ marginLeft: 10, flexGrow: 0, flexShrink: 0, alignItems: 'flex-end' }}>
                        {item.right
                          ? item.right
                          : <ChevronRight size={15} color={c.textFaint} strokeWidth={2} />
                        }
                      </View>
                    </View>
                    </Pressable>
                  </React.Fragment>
                )
              })}
            </View>
          </View>
        ))}

        {/* ── Log out ── */}
        <View style={{ width: '100%' }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setShowLogout(true)
            }}
          style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.68 : 1 })}
        >
          <View style={[styles.accountAction, { borderColor: `${c.ember}35`, backgroundColor: `${c.ember}06` }]}>
            <LogOut size={17} color={c.ember} strokeWidth={2} style={{ marginRight: 9 }} />
            <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: c.ember }}>Log out</Text>
          </View>
          </Pressable>

          <View style={{ height: 14 }} />

          <Pressable
          onPress={confirmDeleteAccount}
          disabled={deletingAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          style={({ pressed }) => ({ width: '100%', opacity: pressed || deletingAccount ? 0.6 : 1 })}
        >
          <View style={[styles.accountAction, { borderColor: `${c.ember}24`, backgroundColor: 'transparent' }]}>
            {deletingAccount ? (
              <ActivityIndicator size="small" color={c.ember} />
            ) : (
              <>
                <Trash2 size={17} color={c.ember} strokeWidth={1.9} style={{ marginRight: 9 }} />
                <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: c.ember }}>Delete account</Text>
              </>
            )}
          </View>
          </Pressable>
        </View>

        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: c.textFaint, textAlign: 'center', marginTop: 24 }}>
          WorkIt v1.0.0
        </Text>
      </ScrollView>

      <LogoutOverlay
        visible={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={() => { setShowLogout(false); signOut() }}
      />

      <AppearanceSheet
        visible={showAppearance}
        onClose={() => setShowAppearance(false)}
      />
    </View>
  )
}
