import { useEffect } from 'react'
import { ActivityIndicator, Linking, View } from 'react-native'
import { router } from 'expo-router'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import { createSessionFromOAuthUrl } from '@/lib/auth/googleOAuth'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'

export default function OAuthCallbackScreen() {
  useEffect(() => {
    Linking.getInitialURL()
      .then(async (url) => {
        if (!url) {
          router.replace('/')
          return
        }

        const { params } = QueryParams.getQueryParams(url)
        const isRecovery = params.type === 'recovery'

        await createSessionFromOAuthUrl(url)
        router.replace(isRecovery ? '/(auth)/reset-password' : '/')
      })
      .catch((error) => {
        logger.error('auth', 'oauthCallback', error)
        router.replace('/(auth)/login')
      })
  }, [])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.obsidian }}>
      <ActivityIndicator color={colors.green} size="large" />
    </View>
  )
}
