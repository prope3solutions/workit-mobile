import { useRef, useState } from 'react'
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { native } from '@/lib/anim'
import { markOnboardingSeen } from '@/lib/onboarding'

const { width: SW, height: SH } = Dimensions.get('window')
const H_PAD  = 20
const ILLO_W = SW - H_PAD * 2
const ILLO_H = SH * 0.42

const SLIDES = [
  {
    heading: 'Find gyms\nnear you.',
    sub: 'Verified gyms in your city, ready to visit.',
    cta: 'Continue',
    image: require('../../assets/onboarding/slide-find.png'),
    bg: '#EFEFE5',
  },
  {
    heading: 'Pick a plan\nthat works.',
    sub: 'Daily, monthly, annual — your call.',
    cta: 'Continue',
    image: require('../../assets/onboarding/slide-plan.png'),
    bg: '#F1F1E9',
  },
  {
    heading: 'Track it. Stay\nconsistent.',
    sub: 'Build a routine. Watch it stick.',
    cta: 'Get Started',
    image: require('../../assets/onboarding/slide-track.png'),
    bg: '#F1EDE2',
  },
]

export default function OnboardingScreen() {
  const { top: safeTop } = useSafeAreaInsets()
  const [activeIndex, setActiveIndex] = useState(0)
  const illoX  = useRef(new Animated.Value(0)).current
  const textX  = useRef(new Animated.Value(0)).current
  const cardSc = useRef(new Animated.Value(1)).current

  function goTo(index: number) {
    Animated.sequence([
      Animated.timing(cardSc, { toValue: 0.97, duration: 80, useNativeDriver: native }),
      Animated.parallel([
        Animated.timing(illoX,  { toValue: -index * ILLO_W, duration: 300, useNativeDriver: native }),
        Animated.timing(textX,  { toValue: -index * ILLO_W, duration: 300, useNativeDriver: native }),
        Animated.spring(cardSc, { toValue: 1, useNativeDriver: native, speed: 24, bounciness: 6 }),
      ]),
    ]).start()
    setActiveIndex(index)
  }

  function handleContinue() {
    if (activeIndex < SLIDES.length - 1) {
      goTo(activeIndex + 1)
    } else {
      markOnboardingSeen()
      router.replace('/(auth)/register')
    }
  }

  function handleSkip() {
    markOnboardingSeen()
    router.replace('/(auth)/login')
  }

  const isLast = activeIndex === SLIDES.length - 1

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>

      {/* Skip */}
      <View style={{
        height: 52, flexDirection: 'row',
        justifyContent: 'flex-end', alignItems: 'center',
        paddingHorizontal: 24, marginTop: safeTop + 8,
      }}>
        {!isLast && (
          <TouchableOpacity onPress={handleSkip} hitSlop={12}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.textMuted }}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Illustration strip */}
      <View style={{
        height: ILLO_H,
        marginHorizontal: H_PAD,
        borderRadius: 24,
        overflow: 'hidden',
      }}>
        <Animated.View style={{
          flexDirection: 'row',
          width: ILLO_W * SLIDES.length,
          height: ILLO_H,
          transform: [{ translateX: illoX }, { scale: cardSc }],
        }}>
          {SLIDES.map((slide, i) => (
            <View key={i} style={{
              width: ILLO_W, height: ILLO_H,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: slide.bg,
            }}>
              <Image
                source={slide.image}
                style={{ width: ILLO_W * 0.78, height: ILLO_H * 0.84 }}
                resizeMode="contain"
              />
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Text strip */}
      <View style={{ marginHorizontal: H_PAD, marginTop: 28, overflow: 'hidden' }}>
        <Animated.View style={{
          flexDirection: 'row',
          width: ILLO_W * SLIDES.length,
          transform: [{ translateX: textX }],
        }}>
          {SLIDES.map((slide, i) => (
            <View key={i} style={{ width: ILLO_W, paddingRight: 16 }}>
              <Text style={{
                fontFamily: 'Syne_700Bold', fontSize: 30,
                letterSpacing: -0.6, lineHeight: 35,
                color: colors.text, marginBottom: 10,
              }}>
                {slide.heading}
              </Text>
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.textMuted }}>
                {slide.sub}
              </Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Fixed bottom */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 24, paddingBottom: 44, paddingTop: 16,
        backgroundColor: colors.bg,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
          {SLIDES.map((_, i) => (
            <View key={i} style={{
              width: i === activeIndex ? 24 : 8, height: 3, borderRadius: 2,
              backgroundColor: i === activeIndex ? colors.obsidian : 'rgba(0,0,0,0.15)',
            }} />
          ))}
        </View>

        <WButton label={SLIDES[activeIndex].cta} variant="dark" onPress={handleContinue} />
      </View>
    </View>
  )
}
