import React, { useRef } from 'react'
import { View, Text, Pressable, Modal, Animated, ActivityIndicator, StyleSheet } from 'react-native'
import { AlertTriangle } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'

interface Props {
  visible: boolean
  gymName: string
  /** Human date access lasts until, e.g. "June 22, 2026". */
  accessUntil: string
  cancelling: boolean
  onDismiss: () => void
  onConfirm: () => void
}

const styles = StyleSheet.create({
  primaryButton: {
    width: '100%',
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

/**
 * Branded bottom-sheet confirmation for cancelling a membership.
 * Mirrors the logout sheet used on the profile screen.
 */
export function CancelMembershipSheet({
  visible, gymName, accessUntil, cancelling, onDismiss, onConfirm,
}: Props) {
  const c = useColors()
  const sheetY = useRef(new Animated.Value(320)).current
  const backdropOp = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: native, speed: 22, bounciness: 4 }),
        Animated.timing(backdropOp, { toValue: 1, duration: 200, useNativeDriver: native }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(sheetY, { toValue: 320, duration: 220, useNativeDriver: native }),
        Animated.timing(backdropOp, { toValue: 0, duration: 180, useNativeDriver: native }),
      ]).start()
    }
  }, [visible])

  if (!visible) return null

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onDismiss}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOp }}>
        <Pressable style={{ flex: 1 }} onPress={cancelling ? undefined : onDismiss} />
      </Animated.View>

      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: c.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40,
        transform: [{ translateY: sheetY }],
      }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 28 }} />

        <View style={{
          width: 56, height: 56, borderRadius: 18,
          backgroundColor: `${c.ember}14`,
          alignItems: 'center', justifyContent: 'center',
          alignSelf: 'center', marginBottom: 16,
        }}>
          <AlertTriangle size={24} color={c.ember} strokeWidth={2} />
        </View>

        <Text style={{
          fontFamily: 'Syne_700Bold', fontSize: 20,
          letterSpacing: -0.4, color: c.text,
          textAlign: 'center', marginBottom: 8,
        }}>
          Cancel membership?
        </Text>
        <Text style={{
          fontFamily: 'DMSans_400Regular', fontSize: 14,
          color: c.textMuted, textAlign: 'center',
          lineHeight: 21, marginBottom: 32,
        }}>
          Your {gymName} membership will stay active until {accessUntil}. After that it won't renew and you'll lose access. This can't be undone.
        </Text>

        <Pressable
          onPress={cancelling ? undefined : onConfirm}
          disabled={cancelling}
          style={({ pressed }) => ({ width: '100%', opacity: pressed || cancelling ? 0.8 : 1 })}
        >
          <View style={[styles.primaryButton, { backgroundColor: c.ember }]}>
            {cancelling
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: '#FFFFFF' }}>Yes, cancel it</Text>}
          </View>
        </Pressable>

        <Pressable
          onPress={cancelling ? undefined : onDismiss}
          disabled={cancelling}
          style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.7 : 1 })}
        >
          <View style={[styles.secondaryButton, { borderColor: c.border, backgroundColor: c.surface2 }]}>
            <Text maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: c.textMuted }}>Keep membership</Text>
          </View>
        </Pressable>
      </Animated.View>
    </Modal>
  )
}
