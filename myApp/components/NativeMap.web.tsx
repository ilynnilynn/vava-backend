import { View } from 'react-native'

export function MapView({ children, style, ...rest }: any) {
  return <View style={[{ backgroundColor: '#E8E9E9' }, style]}>{children}</View>
}

export function Marker(_: any) {
  return null
}
