import { Text, View } from 'react-native'

export type GymMapRegion = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

export function GymLocationMap({ region }: { region: GymMapRegion; onChange: (region: GymMapRegion) => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFEFE9', padding: 24 }}>
      <Text style={{ fontFamily: 'Syne_700Bold', fontSize: 16, color: '#0A0A0A', marginBottom: 6 }}>Map selection is available in the mobile app</Text>
      <Text style={{ fontFamily: 'DMMono_400Regular', fontSize: 12, color: '#6B7280' }}>
        {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}
      </Text>
    </View>
  )
}
