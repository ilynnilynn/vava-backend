'use client'

// ============================================================
// SearchMap — Mapbox GL JS with pro location pins
//
// Top 1/3 of results screen. Pin tap highlights corresponding card.
// Requires NEXT_PUBLIC_MAPBOX_TOKEN env var.
// ============================================================

import { useCallback, useMemo, useRef } from 'react'
import Map, { Marker } from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
import type { LngLatBoundsLike } from 'mapbox-gl'

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

// Default center: Taipei
const DEFAULT_CENTER = { lat: 25.033, lng: 121.565 }
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

export default function SearchMap({ pins, userLat, userLng, selectedPinId, onPinClick }: Props) {
  const mapRef = useRef<MapRef>(null)

  // Compute initial view: use bounds when >1 pin, otherwise center on single pin / user / default
  const initialViewState = useMemo(() => {
    if (pins.length > 1) {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
      const extend = (lat: number, lng: number) => {
        if (lng < minLng) minLng = lng
        if (lat < minLat) minLat = lat
        if (lng > maxLng) maxLng = lng
        if (lat > maxLat) maxLat = lat
      }
      pins.forEach(p => extend(p.lat, p.lng))
      if (userLat && userLng) extend(userLat, userLng)
      return {
        bounds: [[minLng, minLat], [maxLng, maxLat]] as LngLatBoundsLike,
        fitBoundsOptions: { padding: 40 },
      }
    }

    const center = userLat && userLng
      ? { lat: userLat, lng: userLng }
      : pins.length === 1
        ? { lat: pins[0].lat, lng: pins[0].lng }
        : DEFAULT_CENTER

    return {
      latitude: center.lat,
      longitude: center.lng,
      zoom: 14,
    }
  }, [pins, userLat, userLng])

  // onLoad: only set Chinese labels (no fitBounds — handled via initialViewState.bounds)
  const onLoad = useCallback(() => {
    const ref = mapRef.current
    if (!ref) return
    const gl = ref.getMap()

    const style = gl.getStyle()
    if (style?.layers) {
      for (const layer of style.layers) {
        if ('layout' in layer && layer.layout && 'text-field' in layer.layout) {
          gl.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name_zh-Hant'], ['get', 'name']])
        }
      }
    }
  }, [])

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full bg-secondary flex items-center justify-center" style={{ height: '40dvh' }}>
        <p className="text-xs text-muted-foreground">地圖載入失敗</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden" style={{ height: '40dvh' }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        onLoad={onLoad}
        attributionControl={false}
      >
        {pins.map(pin => {
          const isSelected = selectedPinId === pin.id
          return (
            <Marker
              key={pin.id}
              latitude={pin.lat}
              longitude={pin.lng}
              anchor={isSelected ? 'bottom' : 'center'}
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                onPinClick?.(pin.id)
              }}
              style={{ zIndex: isSelected ? 2 : 1, cursor: 'pointer' }}
            >
              {isSelected ? (
                <svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z" fill="#000" />
                  <circle cx="14" cy="14" r="5" fill="#fff" />
                </svg>
              ) : (
                <div
                  className="rounded-full bg-black border border-white"
                  style={{ width: 12, height: 12 }}
                />
              )}
            </Marker>
          )
        })}
      </Map>
    </div>
  )
}
