import { makeRedirectUri } from 'expo-auth-session'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from '@/lib/supabase'

WebBrowser.maybeCompleteAuthSession()

const redirectTo = makeRedirectUri({
  scheme: 'workit',
  path: 'auth/callback',
})

export async function createSessionFromOAuthUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url)

  if (errorCode) {
    throw new Error(String(params.error_description ?? errorCode))
  }

  const accessToken = params.access_token
  const refreshToken = params.refresh_token

  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
    throw new Error('Google did not return a valid WorkIt session.')
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error) throw error
  return data.session
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  })

  if (error) throw error
  if (!data.url) throw new Error('Google sign-in could not be started.')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (result.type !== 'success') return null

  return createSessionFromOAuthUrl(result.url)
}

export function isNewOAuthUser(createdAt?: string) {
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  return Number.isFinite(created) && Date.now() - created < 10 * 60 * 1000
}
