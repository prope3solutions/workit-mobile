import { View, Text } from 'react-native'
import { Image } from 'expo-image'
import { colors } from '@/lib/theme/colors'

interface AvatarProps {
  uri?: string | null
  name?: string | null
  size?: number
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?'

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={200}
      />
    )
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.deep,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'Syne_700Bold',
          fontSize: size * 0.35,
          color: colors.green,
        }}
      >
        {initials}
      </Text>
    </View>
  )
}
