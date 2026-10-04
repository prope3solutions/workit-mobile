export type GymMapRegion = {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

export declare function GymLocationMap(props: {
  region: GymMapRegion
  onChange: (region: GymMapRegion) => void
}): React.ReactElement
