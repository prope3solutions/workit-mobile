import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Alert, Modal, FlatList } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { colors } from '@/lib/theme/colors'
import { WButton } from '@/components/ui/WButton'
import { WInput } from '@/components/ui/WInput'
import { OnboardingShell } from '@/components/gym-onboarding/OnboardingShell'
import { useGymOnboardingId } from '@/lib/hooks/useGymOnboardingId'
import { PLATFORM_FEE_PCT } from '@/lib/constants'

interface Bank {
  name: string
  code: string
}

export default function PayoutScreen() {
  const { gymId } = useGymOnboardingId()
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankPickerOpen, setBankPickerOpen] = useState(false)
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null)
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.functions.invoke('paystack', { body: { action: 'get_banks' } }).then(({ data, error }) => {
      if (error) {
        logger.error('gymOnboarding', 'getBanks', error)
        return
      }
      if (data?.data) setBanks(data.data.map((b: any) => ({ name: b.name, code: b.code })))
    })
  }, [])

  useEffect(() => {
    setAccountName('')
    if (!selectedBank || accountNumber.length !== 10) return
    setVerifying(true)
    supabase.functions
      .invoke('paystack', {
        body: { action: 'verify_account', payload: { account_number: accountNumber, bank_code: selectedBank.code } },
      })
      .then(({ data, error }) => {
        if (error || !data?.data?.account_name) {
          logger.error('gymOnboarding', 'verifyAccount', error ?? data)
          return
        }
        setAccountName(data.data.account_name)
      })
      .finally(() => setVerifying(false))
  }, [selectedBank, accountNumber])

  async function handleNext() {
    if (!gymId) {
      Alert.alert('Error', 'Missing gym. Please restart onboarding.')
      return
    }
    if (!selectedBank || accountNumber.length !== 10 || !accountName) {
      Alert.alert('Incomplete details', 'Select a bank and enter a valid account number to continue.')
      return
    }
    try {
      setLoading(true)
      const { data: gym } = await supabase.from('gyms').select('name').eq('id', gymId).single()

      const { data, error } = await supabase.functions.invoke('paystack', {
        body: {
          action: 'create_subaccount',
          payload: {
            business_name: gym?.name ?? accountName,
            settlement_bank: selectedBank.code,
            account_number: accountNumber,
            // Platform's commission %; the gym's subaccount receives the rest.
            percentage_charge: PLATFORM_FEE_PCT,
          },
        },
      })
      if (error || !data?.data?.subaccount_code) {
        throw new Error(data?.message ?? error?.message ?? 'Could not create payout account.')
      }

      const { error: gymError } = await supabase
        .from('gyms')
        .update({
          paystack_subaccount_code: data.data.subaccount_code,
          settlement_bank_code: selectedBank.code,
          settlement_account_number: accountNumber,
          settlement_account_name: accountName,
          setup_payout: true,
        })
        .eq('id', gymId)
      if (gymError) throw gymError

      router.push('/(gym-onboarding)/review')
    } catch (err: unknown) {
      logger.error('gymOnboarding', 'payout', err)
      const message = err instanceof Error ? err.message : 'Could not save payout details.'
      Alert.alert('Error', message)
    } finally {
      setLoading(false)
    }
  }

  function handleSkip() {
    router.push('/(gym-onboarding)/review')
  }

  return (
    <OnboardingShell
      step={5}
      title="Where should we send your money?"
      subtitle="Set up your payout bank account for member payments via Paystack."
      footer={
        <View style={{ gap: 12 }}>
          <WButton
            label="Continue"
            variant="green"
            onPress={handleNext}
            loading={loading}
            disabled={!selectedBank || accountNumber.length !== 10 || !accountName}
          />
          <WButton label="Skip for now" variant="ghost" onPress={handleSkip} disabled={loading} />
        </View>
      }
    >
      <View style={{ gap: 16 }}>
        <View>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
            Bank
          </Text>
          <TouchableOpacity
            onPress={() => setBankPickerOpen(true)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: colors.border,
              height: 52,
              paddingHorizontal: 16,
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 16, color: selectedBank ? colors.text : colors.textFaint }}>
              {selectedBank?.name ?? 'Select your bank'}
            </Text>
          </TouchableOpacity>
        </View>

        <WInput
          label="Account number"
          value={accountNumber}
          onChangeText={(v) => setAccountNumber(v.replace(/[^0-9]/g, '').slice(0, 10))}
          placeholder="0123456789"
          keyboardType="number-pad"
          maxLength={10}
          hint={verifying ? 'Verifying account...' : accountName ? undefined : undefined}
        />

        {accountName ? (
          <View style={{ backgroundColor: colors.stone2, borderRadius: 12, padding: 16 }}>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
              Account name
            </Text>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 15, color: colors.text }}>
              {accountName}
            </Text>
          </View>
        ) : null}
      </View>

      <Modal visible={bankPickerOpen} animationType="slide" onRequestClose={() => setBankPickerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 64 }}>
          <View style={{ paddingHorizontal: 24, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.text }}>Select bank</Text>
            <TouchableOpacity onPress={() => setBankPickerOpen(false)}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>Close</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={banks}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedBank(item)
                  setBankPickerOpen(false)
                }}
                style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.text }}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </OnboardingShell>
  )
}
