import { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native'
import { colors } from '@/lib/theme/colors'

interface WSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
}

export function WSelect({ label, value, onChange, options, placeholder }: WSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => (query ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())) : options),
    [query, options]
  )

  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 12,
            fontWeight: '500',
            letterSpacing: 0.12,
            color: colors.textMuted,
          }}
        >
          {label}
        </Text>
      )}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
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
        <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 16, color: value ? colors.text : colors.textFaint }}>
          {value || placeholder || 'Select'}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 64 }}>
          <View style={{ paddingHorizontal: 24, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 20, color: colors.text }}>
              {label ?? 'Select'}
            </Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 14, color: colors.text }}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search..."
              placeholderTextColor={colors.textFaint}
              autoFocus
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: colors.border,
                height: 48,
                paddingHorizontal: 16,
                fontFamily: 'DMSans_400Regular',
                fontSize: 15,
                color: colors.text,
              }}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onChange(item)
                  setQuery('')
                  setOpen(false)
                }}
                style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 15, color: colors.text }}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 14, color: colors.textFaint, textAlign: 'center', marginTop: 24 }}>
                No matches.
              </Text>
            }
          />
        </View>
      </Modal>
    </View>
  )
}
