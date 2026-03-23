'use client'

// ============================================================
// SearchMap — Google Maps placeholder
//
// TODO: Install @react-google-maps/api and replace with real map.
// For now: shows a styled placeholder with pin count.
// ============================================================

type Pin = {
  id: string
  lat: number
  lng: number
  label: string
}

type Props = {
  pins: Pin[]
  onPinClick?: (id: string) => void
}

export default function SearchMap({ pins, onPinClick: _onPinClick }: Props) {
  return (
    <div className="h-48 w-full bg-secondary flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl">🗺️</p>
        <p className="text-xs text-muted-foreground mt-1">
          {pins.length > 0 ? `${pins.length} 位設計師` : '地圖載入中'}
        </p>
      </div>
    </div>
  )
}
