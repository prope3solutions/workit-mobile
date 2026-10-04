import { useEffect, useRef } from 'react'
import { View, Text, Animated, Platform } from 'react-native'
import { router } from 'expo-router'
import { colors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'

const FONT_SIZE = 72
const DOT_SIZE  = Math.round(0.22 * FONT_SIZE)

export default function SplashScreen() {
  const wordmarkOpacity = useRef(new Animated.Value(0)).current
  const dotScale        = useRef(new Animated.Value(0)).current
  const dotOpacity      = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(wordmarkOpacity, {
      toValue: 1, duration: 400, useNativeDriver: native,
    }).start()

    const dotTimer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(dotScale, {
          toValue: 1, friction: 3, tension: 220, useNativeDriver: native,
        }),
        Animated.timing(dotOpacity, {
          toValue: 1, duration: 120, useNativeDriver: native,
        }),
      ]).start()
    }, 900)

    const navTimer = setTimeout(() => router.replace('/(auth)/onboarding'), 2600)

    return () => {
      clearTimeout(dotTimer)
      clearTimeout(navTimer)
    }
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: colors.obsidian, alignItems: 'center', justifyContent: 'center' }}>
      {/* Subtle radial glow */}
      <View
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          ...(Platform.OS === 'web'
            ? {
                width: 2, height: 2,
                // @ts-ignore
                boxShadow: '0 0 160px 60px rgba(0,232,122,0.12)',
              }
            : {
                width: 380, height: 380, borderRadius: 190,
                backgroundColor: 'rgba(0,232,122,0.05)',
              }),
        }}
      />

      {/* Wordmark: Work + i (with custom green square dot) + t */}
      <Animated.View style={{ opacity: wordmarkOpacity, flexDirection: 'row', alignItems: 'baseline' }}>

        {/* "Work" — green */}
        <Text style={{
          fontFamily: 'Syne_700Bold', fontSize: FONT_SIZE,
          letterSpacing: -2, color: colors.green, includeFontPadding: false,
        }}>
          Work
        </Text>

        {/* "I" wrapper — render a capital I styled like lowercase, color white,
            then overlay the green square dot above it.
            Using a regular i but making the font color match so the font's own
            dot is invisible against the obsidian background. */}
        <View style={{ position: 'relative' }}>
          {/* Green square dot — springs in after delay */}
          <Animated.View style={{
            position: 'absolute',
            alignSelf: 'center',
            top: -DOT_SIZE + 6,
            width: DOT_SIZE,
            height: DOT_SIZE,
            backgroundColor: colors.green,
            opacity: dotOpacity,
            transform: [{ scale: dotScale }],
            zIndex: 1,
          }} />
          {/* The "i" — color obsidian so the font's built-in dot is invisible */}
          <Text style={{
            fontFamily: 'Syne_700Bold', fontSize: FONT_SIZE,
            letterSpacing: -2, color: colors.chalk, includeFontPadding: false,
          }}>
            {'ı'}
          </Text>
        </View>

        {/* "t" — chalk */}
        <Text style={{
          fontFamily: 'Syne_700Bold', fontSize: FONT_SIZE,
          letterSpacing: -2, color: colors.chalk, includeFontPadding: false,
        }}>
          t
        </Text>

      </Animated.View>
    </View>
  )
}
