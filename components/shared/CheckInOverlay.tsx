import React, { useRef, useEffect, useState } from 'react'
import { Alert, View, Text, Modal, Animated, Pressable, ScrollView, Dimensions } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Check, Clock } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'
import Svg, { Line, Circle } from 'react-native-svg'
import { useSessionStore } from '@/lib/stores/sessionStore'
import { useWeightStore } from '@/lib/stores/weightStore'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const CARD_W = Math.min(SCREEN_W - 80, 340)
// Fixed sheet height so the card stays the SAME height across every state
// (idle / checked-in / checked-out). Sized to the tallest state — checkout,
// with the recent-check-ins list — so nothing ever jumps between states.
const SHEET_HEIGHT = Math.min(SCREEN_H * 0.82, 600)

const MEMBER_CODE = 'FRG-CHN-1024'
const GYM_NAME    = 'Forge Gym'
const PLAN        = 'Monthly'

const MOTIVATION_QUOTES = [
  'Showing up is the hardest part — you’re already here.',
  'Future you is already thanking you for this.',
  'Small sessions, stacked daily, build the biggest changes.',
  'Discipline beats motivation. You’ve got both today.',
  'No perfect days needed — just this one rep.',
  'Every check-in is a promise kept to yourself.',
  'The gym doesn’t care how you feel. Show up anyway.',
  'Consistency is the real flex.',
  'You didn’t come this far to only come this far.',
  'One more session closer to the version of you that you’re building.',
]

const RECENT_CHECKINS = [
  { date: 'Today',     time: '7:42 AM', duration: '1h 12m' },
  { date: 'Yesterday', time: '6:55 AM', duration: '58m'    },
  { date: 'Jun 4',     time: '7:18 PM', duration: '1h 05m' },
]

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m < 1)  return `${s}s`
  if (m < 60) return `${m}m ${s.toString().padStart(2, '0')}s`
  const h   = Math.floor(m / 60)
  const rem = m % 60
  return `${h}h ${rem.toString().padStart(2, '0')}m`
}

function CardGrid({ width, height }: { width: number; height: number }) {
  const step = 26
  const lines: React.ReactElement[] = []
  for (let x = step; x < width; x += step)
    lines.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />)
  for (let y = step; y < height; y += step)
    lines.push(<Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />)
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, borderRadius: 20 }}>
      {lines}
      <Circle cx={width * 0.82} cy={-16} r={80} fill="rgba(0,232,122,0.09)" />
    </Svg>
  )
}

function FlipCard({ status, elapsed, checkInTime }: {
  status: 'idle' | 'in' | 'out'
  elapsed: number
  checkInTime: Date | null
}) {
  const colors = useColors()
  const flipAnim = useRef(new Animated.Value(0)).current
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    if (status === 'in' && !flipped) flip()
  }, [status])

  function flip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const toValue = flipped ? 0 : 1
    Animated.spring(flipAnim, { toValue, useNativeDriver: native, speed: 12, bounciness: 4 }).start()
    setFlipped(f => !f)
  }

  const frontRotateY = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
  const backRotateY  = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] })
  const frontOp      = flipAnim.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [1, 1, 0, 0] })
  const backOp       = flipAnim.interpolate({ inputRange: [0, 0.5, 0.5, 1], outputRange: [0, 0, 1, 1] })

  const cardHeight = 190

  return (
    <Pressable onPress={flip} style={{ width: CARD_W, height: cardHeight, alignSelf: 'center', marginBottom: 22 }}>
      <Animated.View style={{
        position: 'absolute', width: '100%', height: '100%',
        transform: [{ perspective: 1200 }, { rotateY: frontRotateY }],
        opacity: frontOp, backfaceVisibility: 'hidden',
      }}>
        <View style={{ flex: 1, backgroundColor: colors.obsidian, borderRadius: 20, overflow: 'hidden' }}>
          <CardGrid width={CARD_W} height={cardHeight} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <View style={{
                borderWidth: 1, borderColor: 'rgba(0,232,122,0.28)', borderRadius: 999,
                paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(0,232,122,0.08)',
              }}>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 10, color: colors.green }}>
                  {status === 'in' ? 'In session' : 'Active'}
                </Text>
              </View>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(245,245,240,0.35)' }}>
                {GYM_NAME} · {PLAN}
              </Text>
            </View>
            <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 22, color: colors.chalk, letterSpacing: 3.5, textAlign: 'center' }}>
              {MEMBER_CODE}
            </Text>
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', width: '100%', marginTop: 18, marginBottom: 12 }} />
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, color: 'rgba(245,245,240,0.28)', letterSpacing: 1.1, textTransform: 'uppercase' }}>
              Active Member · Tap to flip
            </Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={{
        position: 'absolute', width: '100%', height: '100%',
        transform: [{ perspective: 1200 }, { rotateY: backRotateY }],
        opacity: backOp, backfaceVisibility: 'hidden',
      }}>
        <View style={{ flex: 1, backgroundColor: colors.obsidian, borderRadius: 20, overflow: 'hidden', padding: 18 }}>
          {status === 'in' && checkInTime ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{
                width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(0,232,122,0.12)',
                alignItems: 'center', justifyContent: 'center', marginBottom: 10,
              }}>
                <Clock size={17} color={colors.green} strokeWidth={2} />
              </View>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, color: 'rgba(245,245,240,0.38)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                Time at gym
              </Text>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 30, letterSpacing: -0.6, color: colors.chalk }}>
                {formatElapsed(elapsed)}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: 'rgba(245,245,240,0.35)', marginTop: 6 }}>
                Checked in at {checkInTime.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, color: 'rgba(245,245,240,0.38)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
                Recent check-ins
              </Text>
              {RECENT_CHECKINS.map((ci, i) => (
                <View key={i} style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingVertical: 7, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: 'rgba(255,255,255,0.06)',
                }}>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: i === 0 ? colors.chalk : 'rgba(245,245,240,0.5)' }}>
                    {ci.date}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 10, color: 'rgba(245,245,240,0.35)' }}>{ci.duration}</Text>
                    <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 10, color: 'rgba(245,245,240,0.4)' }}>{ci.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  )
}

interface CheckInOverlayProps {
  visible: boolean
  onClose: () => void
  onCheckIn?: () => Promise<void>
}

export function CheckInOverlay({ visible, onClose, onCheckIn }: CheckInOverlayProps) {
  const colors = useColors()
  const { status, checkInTime, elapsed, sessionDuration,
    setStatus, setCheckInTime, setElapsed, setSessionDuration, reset } = useSessionStore()

  const sheetY = useRef(new Animated.Value(400)).current
  const backdropOp = useRef(new Animated.Value(0)).current
  const btnScale = useRef(new Animated.Value(1)).current

  // Fresh motivational quote each time the sheet opens for a check-in
  const [quote, setQuote] = useState(MOTIVATION_QUOTES[0])

  // Celebratory transition — ring pop-in, then content fades/slides up
  const flashOp  = useRef(new Animated.Value(0)).current
  const ringScale = useRef(new Animated.Value(1)).current
  const ringOp    = useRef(new Animated.Value(1)).current
  const contentOp = useRef(new Animated.Value(1)).current
  const contentY  = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      setQuote(MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)])
      Animated.parallel([
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: native, speed: 18, bounciness: 4 }),
        Animated.timing(backdropOp, { toValue: 1, duration: 200, useNativeDriver: native }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(sheetY, { toValue: 400, duration: 220, useNativeDriver: native }),
        Animated.timing(backdropOp, { toValue: 0, duration: 180, useNativeDriver: native }),
      ]).start()
    }
  }, [visible])

  useEffect(() => {
    if (status !== 'in') return
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [status])

  function playCelebration() {
    flashOp.setValue(1)
    ringScale.setValue(0)
    ringOp.setValue(0)
    contentOp.setValue(0)
    contentY.setValue(20)

    Animated.sequence([
      Animated.timing(flashOp, { toValue: 0, duration: 320, useNativeDriver: native }),
      Animated.parallel([
        Animated.spring(ringScale, { toValue: 1, useNativeDriver: native, speed: 14, bounciness: 12 }),
        Animated.timing(ringOp, { toValue: 1, duration: 220, useNativeDriver: native }),
      ]),
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(contentOp, { toValue: 1, duration: 280, useNativeDriver: native }),
        Animated.spring(contentY, { toValue: 0, useNativeDriver: native, speed: 20, bounciness: 4 }),
      ]),
    ]).start(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    })
  }

  function handleCheckIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 80)
    setCheckInTime(new Date())
    setElapsed(0)
    setStatus('in')
    playCelebration()
    void onCheckIn?.().catch((error) => {
      reset()
      Alert.alert('Could not check in', error instanceof Error ? error.message : 'Please try again.')
    })
  }

  function handleCheckOut() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSessionDuration(formatElapsed(elapsed))
    setStatus('out')
    useWeightStore.getState().completeSession()
    playCelebration()
  }

  function handleDone() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    reset()
    onClose()
  }

  if (!visible) return null

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOp }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: SHEET_HEIGHT,
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        transform: [{ translateY: sheetY }],
        overflow: 'hidden',
      }}>
        {/* White flash on transition, matches the celebratory beat from the full-screen version */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: colors.white, opacity: flashOp, zIndex: 10,
          }}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Sheet handle bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {status === 'out' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
              <Animated.View style={{
                width: 64, height: 64, borderRadius: 20, backgroundColor: colors.obsidian,
                alignItems: 'center', justifyContent: 'center', marginBottom: 18,
                transform: [{ scale: ringScale }], opacity: ringOp,
                shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.18, shadowRadius: 20, elevation: 10,
              }}>
                <Check size={28} color={colors.chalk} strokeWidth={2.5} />
              </Animated.View>

              <Animated.View style={{ width: '100%', alignItems: 'center', opacity: contentOp, transform: [{ translateY: contentY }] }}>
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, letterSpacing: -0.52, color: colors.text, marginBottom: 4, textAlign: 'center' }}>
                  Session done.
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, marginBottom: 24, textAlign: 'center' }}>
                  {checkInTime?.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })} · {GYM_NAME}
                </Text>

                <View style={{
                  width: '100%', backgroundColor: colors.obsidian, borderRadius: 18,
                  padding: 18, marginBottom: 22, flexDirection: 'row', alignItems: 'center', gap: 14,
                }}>
                  <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={19} color={colors.green} strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 9, color: 'rgba(245,245,240,0.4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Session duration</Text>
                    <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 22, letterSpacing: -0.44, color: colors.chalk }}>{sessionDuration}</Text>
                  </View>
                </View>

                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 15, letterSpacing: -0.3, color: colors.text, marginBottom: 10, alignSelf: 'flex-start' }}>
                  Recent check-ins
                </Text>
                <View style={{ width: '100%', backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 24 }}>
                  {RECENT_CHECKINS.map((ci, i) => (
                    <View key={i} style={{
                      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      paddingHorizontal: 14, paddingVertical: 12,
                      borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border,
                    }}>
                      <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: i === 0 ? colors.text : colors.textMuted }}>{ci.date}</Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 11, color: colors.textFaint }}>{ci.duration}</Text>
                        <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 11, color: colors.textMuted }}>{ci.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={handleDone}
                  style={({ pressed }) => ({
                    width: '100%', height: 56, borderRadius: 16,
                    backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center',
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.obsidian }}>Done</Text>
                </Pressable>
              </Animated.View>
            </View>
          ) : status === 'in' ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
              <Animated.View style={{
                width: 64, height: 64, borderRadius: 20, backgroundColor: colors.green,
                alignItems: 'center', justifyContent: 'center', marginBottom: 18,
                transform: [{ scale: ringScale }], opacity: ringOp,
                shadowColor: colors.green, shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
              }}>
                <Check size={30} color={colors.obsidian} strokeWidth={2.8} />
              </Animated.View>

              <Animated.View style={{ width: '100%', alignItems: 'center', opacity: contentOp, transform: [{ translateY: contentY }] }}>
                <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 26, letterSpacing: -0.52, color: colors.text, marginBottom: 4, textAlign: 'center' }}>
                  Checked in.
                </Text>
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, marginBottom: 22, textAlign: 'center' }}>
                  {checkInTime?.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })} · {GYM_NAME}
                </Text>

                <FlipCard status={status} elapsed={elapsed} checkInTime={checkInTime} />

                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, color: colors.textFaint, textAlign: 'center', marginBottom: 20 }}>
                  Tap the card to see your live session timer
                </Text>

                <Animated.View style={{ width: '100%', transform: [{ scale: btnScale }] }}>
                  <Pressable
                    onPress={handleCheckOut}
                    onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: native, speed: 50, bounciness: 0 }).start()}
                    onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: native, speed: 30, bounciness: 4 }).start()}
                    style={{ height: 56, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.obsidian }}>Check out</Text>
                  </Pressable>
                </Animated.View>

                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => ({
                    width: '100%', height: 48, borderRadius: 14,
                    alignItems: 'center', justifyContent: 'center',
                    marginTop: 8,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.textMuted }}>
                    Minimize / Continue workout
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
              <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 24, letterSpacing: -0.48, color: colors.text, marginBottom: 4, textAlign: 'center' }}>
                Check In
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textMuted, marginBottom: 24, textAlign: 'center' }}>
                Show this at the front desk
              </Text>

              <FlipCard status={status} elapsed={elapsed} checkInTime={checkInTime} />

              <Animated.View style={{ width: '100%', transform: [{ scale: btnScale }] }}>
                <Pressable
                  onPress={handleCheckIn}
                  onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: native, speed: 50, bounciness: 0 }).start()}
                  onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: native, speed: 30, bounciness: 4 }).start()}
                  style={{
                    height: 56, borderRadius: 16, backgroundColor: colors.green,
                    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
                  }}
                >
                  <Check size={17} color={colors.obsidian} strokeWidth={2.8} />
                  <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: colors.obsidian, letterSpacing: -0.32 }}>
                    Check in now
                  </Text>
                </Pressable>
              </Animated.View>

              <View style={{
                width: '100%', paddingHorizontal: 8, marginTop: 24,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{
                  fontFamily: 'DMSans_400Regular', fontSize: 14, lineHeight: 21,
                  color: colors.textMuted, textAlign: 'center', fontStyle: 'italic',
                }}>
                  “{quote}”
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  )
}
