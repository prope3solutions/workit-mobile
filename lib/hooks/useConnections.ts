import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export type ConnectionRequest = {
  id: string
  requester_id: string
  addressee_id: string
  status: string
  created_at: string
  updated_at: string
}

export function useConnections() {
  const [requests, setRequests] = useState<ConnectionRequest[]>([])
  const [loading, setLoading] = useState(true)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_my_connection_requests')
    if (error) logger.error('connections', 'load-requests', error)
    setRequests((data ?? []) as ConnectionRequest[])
    setLoading(false)
  }, [])

  const requestConnection = useCallback(async (addresseeId: string) => {
    const { data, error } = await supabase.rpc('request_connection', { p_addressee_id: addresseeId })
    if (error) throw error
    return data
  }, [])

  const respondConnection = useCallback(async (connectionId: string, status: 'accepted' | 'declined' | 'blocked') => {
    const { data, error } = await supabase.rpc('respond_connection', { p_connection_id: connectionId, p_status: status })
    if (error) throw error
    setRequests((current) => current.filter((request) => request.id !== connectionId))
    return data
  }, [])

  useEffect(() => { loadRequests() }, [loadRequests])

  return { requests, loading, requestConnection, respondConnection, refetch: loadRequests }
}
