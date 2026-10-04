import { Platform, StyleSheet, View } from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { MapPin } from 'lucide-react-native'

export type GymMapRegion = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

export function GymLocationMap({ region, onChange }: { region: GymMapRegion; onChange: (region: GymMapRegion) => void }) {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={region}
      onRegionChangeComplete={onChange}
      showsUserLocation
      showsMyLocationButton
    >
      <Marker
        coordinate={{ latitude: region.latitude, longitude: region.longitude }}
        draggable
        onDragEnd={(event) => onChange({ ...region, ...event.nativeEvent.coordinate })}
      >
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#00E87A', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#07120D' }}>
          <MapPin size={18} color="#07120D" fill="#00E87A" />
        </View>
      </Marker>
    </MapView>
  )
}
