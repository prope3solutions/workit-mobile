import { View, Text } from 'react-native'
import { colors } from '@/lib/theme/colors'

interface WordmarkProps {
  size?: number
  /** Color of the "it" letters. Defaults to obsidian ink so it reads on the
   *  light auth backgrounds. Pass colors.chalk on dark surfaces. */
  inkColor?: string
}

/**
 * WorkIt wordmark, matching the logo:
 *   "Work" in green + "it" in ink, where the dot of the "i" is a green square
 *   sitting above the stem.
 */
export function Wordmark({ size = 22, inkColor = colors.obsidian }: WordmarkProps) {
  const DOT = Math.round(size * 0.22)

  const baseText = {
    fontFamily: 'Syne_700Bold' as const,
    fontSize: size,
    letterSpacing: -0.035 * size,
    includeFontPadding: false,
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      {/* "Work" — green */}
      <Text style={{ ...baseText, color: colors.green }}>Work</Text>

      {/* "i" — ink, with a green square dot overlaid above the dotless stem */}
      <View style={{ position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            alignSelf: 'center',
            top: -DOT + Math.round(size * 0.08),
            width: DOT,
            height: DOT,
            backgroundColor: colors.green,
            zIndex: 1,
          }}
        />
        <Text style={{ ...baseText, color: inkColor }}>{'ı'}</Text>
      </View>

      {/* "t" — ink */}
      <Text style={{ ...baseText, color: inkColor }}>t</Text>
    </View>
  )
}
