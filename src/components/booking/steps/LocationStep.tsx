'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useGeolocation } from '@/hooks/useGeolocation'

type Props = {
  lat: number | null
  lng: number | null
  label: string
  onSet: (lat: number, lng: number, label: string) => void
}

type Prediction = { place_id: string; description: string }

export default function LocationStep({ lat, lng, label, onSet }: Props) {
  const geo = useGeolocation()
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [searching, setSearching] = useState(false)

  // Auto-request GPS on mount if no location set
  useEffect(() => {
    if (lat === null && lng === null) {
      geo.requestPermission()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When GPS resolves, set it as the location
  useEffect(() => {
    if (geo.lat !== null && geo.lng !== null && lat === null) {
      onSet(geo.lat, geo.lng, '目前位置')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.lat, geo.lng])

  async function handleSearch(input: string) {
    setQuery(input)
    if (input.trim().length < 2) {
      setPredictions([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input.trim())}`)
      const data = await res.json()
      setPredictions(data.predictions ?? [])
    } catch {
      setPredictions([])
    } finally {
      setSearching(false)
    }
  }

  async function handleSelectPlace(place: Prediction) {
    // Geocode the selected place
    try {
      const res = await fetch('/api/places/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: place.description }),
      })
      const data = await res.json()
      if (data.lat && data.lng) {
        onSet(data.lat, data.lng, place.description)
        setPredictions([])
        setQuery('')
      }
    } catch {
      // silently fail — user can retry
    }
  }

  function handleUseCurrentLocation() {
    geo.requestPermission()
  }

  const isSet = lat !== null && lng !== null

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">你在哪裡？</h2>

      {/* Current location chip */}
      <Button
        variant="outline"
        onClick={handleUseCurrentLocation}
        disabled={geo.loading}
        className={`rounded-full ${isSet && label === '目前位置' ? 'border-foreground bg-foreground text-primary-foreground' : ''}`}
      >
        {geo.loading ? '定位中...' : '📍 目前位置'}
      </Button>

      {geo.error && (
        <p className="text-xs text-destructive">{geo.error}</p>
      )}

      {/* Manual search */}
      <div className="space-y-2">
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="搜尋地址（例：大安區忠孝東路）"
          className="text-sm"
        />

        {searching && (
          <p className="text-xs text-muted-foreground">搜尋中...</p>
        )}

        {predictions.length > 0 && (
          <ul className="rounded-xl border border-border bg-card divide-y divide-border">
            {predictions.map((p) => (
              <li key={p.place_id}>
                <button
                  onClick={() => handleSelectPlace(p)}
                  className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  {p.description}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected location display */}
      {isSet && (
        <div className="rounded-xl bg-success-muted p-3">
          <p className="text-sm font-medium text-success-foreground">📍 {label}</p>
        </div>
      )}
    </div>
  )
}
