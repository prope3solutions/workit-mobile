import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { BookingStatus, PricingType, ServiceType, TimeBlock } from '@/types/database'

export async function createTrainerBooking(params: {
  memberId: string
  trainerId: string
  gymId: string | null
  serviceType: ServiceType
  pricingType: PricingType
  amountNaira: number
  sessionDate: string
  sessionTimeBlock: TimeBlock | null
  status?: BookingStatus
  paystackReference?: string | null
  notify?: boolean
}): Promise<{ bookingId: string; amountNaira: number } | { error: string }> {
  try {
    const { data: bookingRows, error: bookingError } = await supabase.rpc('create_trainer_booking', {
      p_trainer_id: params.trainerId,
      p_gym_id: params.gymId,
      p_service_type: params.serviceType,
      p_pricing_type: params.pricingType,
      p_session_date: params.sessionDate,
      p_session_time_block: params.sessionTimeBlock,
      p_paystack_reference: params.paystackReference ?? null,
    })
    if (bookingError) throw bookingError
    const booking = (bookingRows as { booking_id: string; amount_naira: number }[] | null)?.[0]
    if (!booking?.booking_id) throw new Error('Could not create this booking.')

    if (params.notify !== false) {
      const { data: trainerProfile, error: trainerError } = await supabase
        .from('trainer_profiles')
        .select('user_id')
        .eq('id', params.trainerId)
        .single()
      if (trainerError) throw trainerError

      const trainerUserId = trainerProfile?.user_id
      if (trainerUserId) {
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: trainerUserId,
          title: 'New booking',
          body: 'A member just booked a session with you.',
          type: 'trainer_booking',
          metadata: { booking_id: booking.booking_id },
        })
        if (notifError) throw notifError

        const { error: paidNotifError } = await supabase.from('notifications').insert({
          user_id: trainerUserId,
          title: 'Payment received',
          body: 'Payment for a new booking has been confirmed.',
          type: 'payment_received',
          metadata: { booking_id: booking.booking_id },
        })
        if (paidNotifError) throw paidNotifError
      }
    }

    return { bookingId: booking.booking_id, amountNaira: booking.amount_naira }
  } catch (err) {
    logger.error('createTrainerBooking', 'createBooking', err)
    const message = err instanceof Error ? err.message : 'Could not create this booking.'
    return { error: message }
  }
}
