'use client'

// ============================================================
// SearchMap — Google Maps with pro location pins
//
// Top 1/3 of results screen. Pin tap highlights corresponding card.
// Requires NEXT_PUBLIC_GOOGLE_MAPS_KEY env var.
// ============================================================

import { useCallback, useState } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api'

export type MapPin = {
  id: string
  lat: number
  lng: number
  label: string
}

type Props = {
  pins: MapPin[]
  userLat?: number | null
  userLng?: number | null
  selectedPinId?: string | null
  onPinClick?: (id: string) => void
}

const containerStyle = { width: '100%', height: '100%' }

// Default center: Taipei
const DEFAULT_CENTER = { lat: 25.033, lng: 121.565 }

export default function SearchMap({ pins, userLat, userLng, selectedPinId, onPinClick }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '',
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)

  const center = userLat && userLng
    ? { lat: userLat, lng: userLng }
    : pins.length > 0
      ? { lat: pins[0].lat, lng: pins[0].lng }
      : DEFAULT_CENTER

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance)
    if (pins.length > 1) {
      const bounds = new google.maps.LatLngBounds()
      pins.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }))
      if (userLat && userLng) bounds.extend({ lat: userLat, lng: userLng })
      mapInstance.fitBounds(bounds, 40)
    }
  }, [pins, userLat, userLng])

  const onUnmount = useCallback(() => setMap(null), [])

  // Suppress unused var warning — map ref kept for future pan/zoom
  void map

  if (loadError) {
    return (
      <div className="h-48 w-full bg-secondary flex items-center justify-center">
        <p className="text-xs text-muted-foreground">地圖載入失敗</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="h-48 w-full bg-secondary flex items-center justify-center">
        <p className="text-xs text-muted-foreground">地圖載入中...</p>
      </div>
    )
  }

  return (
    <div className="h-48 w-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={14}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {pins.map(pin => (
          <MarkerF
            key={pin.id}
            position={{ lat: pin.lat, lng: pin.lng }}
            title={pin.label}
            onClick={() => onPinClick?.(pin.id)}
            opacity={selectedPinId && selectedPinId !== pin.id ? 0.5 : 1}
          />
        ))}
      </GoogleMap>
    </div>
  )
}
