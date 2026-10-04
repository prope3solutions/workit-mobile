import React, { useRef } from 'react'
import { View, Text, Pressable, Modal, Animated } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Sun, Moon, Smartphone } from 'lucide-react-native'
import { useColors } from '@/lib/theme/colors'
import { useThemeStore, ThemePreference } from '@/lib/stores/themeStore'
import { native } from '@/lib/anim'

export const THEME_OPTIONS: { key: ThemePreference; label: string; sub: string; Icon: React.ComponentType<any> }[] = [
  { key: 'system', label: 'System default', sub: 'Follows your device setting', Icon: Smartphone },
  { key: 'light',  label: 'Light',          sub: 'Always light',                Icon: Sun },
  { key: 'dark',   label: 'Dark',           sub: 'Always dark',                 Icon: Moon },
]

export function AppearanceSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const c = useColors()
  const { preference, setPreference } = useThemeStore()
  const sheetY = useRef(new Animated.Value(400)).current
  const backdropOp = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(sheetY, { toValue: 0, useNativeDriver: native, speed: 22, bounciness: 4 }),
        Animated.timing(backdropOp, { toValue: 1, duration: 200, useNativeDriver: native }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(sheetY, { toValue: 400, duration: 220, useNativeDriver: native }),
        Animated.timing(backdropOp, { toValue: 0, duration: 180, useNativeDriver: native }),
      ]).start()
    }
  }, [visible])

  if (!visible) return null

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropOp }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: c.surface,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48,
        transform: [{ translateY: sheetY }],
      }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 28 }} />

        <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, letterSpacing: -0.4, color: c.text, marginBottom: 6 }}>
          Appearance
        </Text>
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: c.textMuted, marginBottom: 24 }}>
          Choose how WorkIt looks to you.
        </Text>

        <View style={{ borderRadius: 18, borderWidth: 1, borderColor: c.border, overflow: 'hidden', backgroundColor: c.surface }}>
          {THEME_OPTIONS.map((opt, i) => {
            const selected = preference === opt.key
            const Icon = opt.Icon
            return (
              <Pressable
                key={opt.key}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPreference(opt.key) }}
                style={({ pressed }) => ({
                  width: '100%', minHeight: 72,
                  borderTopWidth: i > 0 ? 1 : 0, borderTopColor: c.border,
                  backgroundColor: pressed ? c.surface2 : c.surface,
                })}
              >
                <View style={{ width: '100%', minHeight: 72, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 34, height: 34, borderRadius: 10, marginRight: 14,
                    flexGrow: 0, flexShrink: 0,
                    backgroundColor: selected ? `${c.green}18` : c.stone2,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={16} color={selected ? c.green : c.textMuted} strokeWidth={1.75} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: c.text }}>{opt.label}</Text>
                    <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={{ fontFamily: 'DMSans_400Regular', fontSize: 12, lineHeight: 16, color: c.textMuted, marginTop: 1 }}>{opt.sub}</Text>
                  </View>
                  <View style={{
                    width: 20, height: 20, borderRadius: 10, marginLeft: 12,
                    flexGrow: 0, flexShrink: 0,
                    borderWidth: selected ? 0 : 2, borderColor: c.border,
                    backgroundColor: selected ? c.green : 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.obsidian }} />}
                  </View>
                </View>
              </Pressable>
            )
          })}
        </View>
      </Animated.View>
    </Modal>
  )
}
