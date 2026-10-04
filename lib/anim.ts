import { Platform } from 'react-native'

// useNativeDriver works on iOS/Android but not web.
// Import this instead of hardcoding true everywhere.
export const native = Platform.OS !== 'web'
