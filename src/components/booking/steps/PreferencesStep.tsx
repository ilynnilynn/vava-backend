'use client'

import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

type Props = {
  silentPreference: boolean
  customerNote: string
  refPhotoUrl: string | null
  onSilentChange: (on: boolean) => void
  onNoteChange: (note: string) => void
  onRefPhotoChange: (url: string | null) => void
}

export default function PreferencesStep({
  silentPreference,
  customerNote,
  refPhotoUrl,
  onSilentChange,
  onNoteChange,
  onRefPhotoChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/bookings/upload-ref-photo', {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        const data = await res.json()
        setUploadError(data.error ?? '上傳失敗')
        return
      }

      const { url } = await res.json()
      onRefPhotoChange(url)
    } catch {
      setUploadError('網路錯誤，請稍後再試')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Silent preference */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">其他偏好（選填）</h2>

        <button
          onClick={() => onSilentChange(!silentPreference)}
          className={`flex items-center gap-3 rounded-2xl border-2 p-4 w-full text-left transition-all ${
            silentPreference
              ? 'border-foreground bg-foreground text-primary-foreground'
              : 'border-border bg-card text-foreground hover:border-foreground/30'
          }`}
        >
          <span className="text-lg">🤫</span>
          <div>
            <span className="block text-sm font-semibold">靜默服務</span>
            <span className={`block text-xs mt-0.5 ${
              silentPreference ? 'text-primary-foreground/70' : 'text-muted-foreground'
            }`}>
              希望服務過程中不需要聊天
            </span>
          </div>
        </button>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">備註</p>
        <Input
          value={customerNote}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="想跟設計師說的話..."
          className="text-sm"
        />
      </div>

      {/* Reference photo upload */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">參考照片（選填）</p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {refPhotoUrl ? (
          <div className="relative w-24 h-24">
            <img
              src={refPhotoUrl}
              alt="參考照片"
              className="w-24 h-24 rounded-xl object-cover"
            />
            <button
              onClick={() => {
                onRefPhotoChange(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-primary-foreground text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center w-24 h-24 rounded-xl border-2 border-dashed border-border bg-card text-muted-foreground hover:border-foreground/30 transition-colors"
          >
            {uploading ? (
              <span className="text-xs">上傳中...</span>
            ) : (
              <span className="text-2xl">+</span>
            )}
          </button>
        )}

        {uploadError && (
          <p className="text-xs text-destructive">{uploadError}</p>
        )}
      </div>
    </div>
  )
}
