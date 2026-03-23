'use client'

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
  onSilentChange,
  onNoteChange,
}: Props) {
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

      {/* Ref photo placeholder — upload handled separately */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">參考照片（選填）</p>
        <p className="text-xs text-muted-foreground">即將推出上傳功能</p>
      </div>
    </div>
  )
}
