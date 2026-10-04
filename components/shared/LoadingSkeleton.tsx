import { useEffect, useRef } from 'react'
import { Animated, View, ViewStyle } from 'react-native'
import { colors } from '@/lib/theme/colors'
import { native } from '@/lib/anim'

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, duration: 700, useNativeDriver: native }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: native }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: colors.deep, opacity },
        style,
      ]}
    />
  )
}

export function GymCardSkeleton() {
  return (
    <View style={{ backgroundColor: colors.deep, borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
      <Skeleton height={180} borderRadius={0} />
      <View style={{ padding: 16, gap: 8 }}>
        <Skeleton width="60%" height={18} />
        <Skeleton width="40%" height={14} />
        <Skeleton width="80%" height={14} />
      </View>
    </View>
  )
}
