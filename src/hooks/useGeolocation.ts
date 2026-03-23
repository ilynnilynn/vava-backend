'use client'

import { useState, useCallback } from 'react'

type GeoState = {
  lat: number | null
  lng: number | null
  loading: boolean
  error: string | null
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    loading: false,
    error: null,
  })

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: '此裝置不支援定位功能' }))
      return
    }
    setState(s => ({ ...s, loading: true, error: null }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          loading: false,
          error: null,
        })
      },
      (err) => {
        setState(s => ({
          ...s,
          loading: false,
          error: err.code === 1 ? '定位權限被拒絕' : '無法取得位置',
        }))
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [])

  return { ...state, requestPermission }
}
