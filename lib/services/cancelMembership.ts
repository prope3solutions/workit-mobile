import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * Cancels a membership using the access-until-period-end model:
 * flips status to 'cancelled' but leaves end_date untouched, so the member
 * keeps access until their paid period ends. After end_date passes, the
 * membership no longer grants access (see useMembership).
 *
 * Goes through the cancel_own_membership RPC (SECURITY DEFINER) because members
 * have no direct UPDATE grant on the memberships table.
 */
export async function cancelMembership(
  membershipId: string,
  _memberId: string
): Promise<{ ok: true } | { error: string }> {
  try {
    const { error } = await supabase.rpc('cancel_own_membership', {
      p_membership_id: membershipId,
    })
    if (error) throw error
    return { ok: true }
  } catch (err) {
    logger.error('membership', 'cancelMembership', err)
    const message = err instanceof Error ? err.message : 'Could not cancel your membership.'
    return { error: message }
  }
}
