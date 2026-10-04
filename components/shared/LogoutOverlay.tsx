import React, { useRef } from 'react'
import { View, Text, Modal, Animated, Pressable } from 'react-native'
import { LogOut } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'

interface LogoutOverlayProps {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function LogoutOverlay({ visible, onCancel, onConfirm }: LogoutOverlayProps) {
  const colors = useColors()
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
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOp }}>
        <Pressable style={{ flex: 1 }} onPress={onCancel} />
      </Animated.View>

      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: colors.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40,
        transform: [{ translateY: sheetY }],
      }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 28 }} />

        <View style={{
          width: 56, height: 56, borderRadius: 18,
          backgroundColor: `${colors.ember}14`,
          alignItems: 'center', justifyContent: 'center',
          alignSelf: 'center', marginBottom: 16,
        }}>
          <LogOut size={24} color={colors.ember} strokeWidth={2} />
        </View>

        <Text style={{
          fontFamily: 'Syne_700Bold', fontSize: 20,
          letterSpacing: -0.4, color: colors.text,
          textAlign: 'center', marginBottom: 8,
        }}>
          Log out?
        </Text>
        <Text style={{
          fontFamily: 'DMSans_400Regular', fontSize: 14,
          color: colors.textMuted, textAlign: 'center',
          lineHeight: 21, marginBottom: 32,
        }}>
          You'll need to sign in again to access your account.
        </Text>

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <Pressable
            onPress={onConfirm}
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: native, speed: 50, bounciness: 0 }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: native, speed: 30, bounciness: 4 }).start()}
            style={{
              height: 54, borderRadius: 16,
              backgroundColor: colors.ember,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: '#FFFFFF' }}>Yes, log me out</Text>
          </Pressable>
        </Animated.View>

        <Pressable
          onPress={onCancel}
          style={({ pressed }) => ({
            height: 52, borderRadius: 16,
            borderWidth: 1, borderColor: colors.border,
            backgroundColor: colors.bg,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.textMuted }}>Cancel</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  )
}
