import Link from 'next/link'

type ProCardProps = {
  proId: string
  displayName: string
  profilePhotoUrl: string | null
  studioAddress: string
  availableSlotCount: number
  startingPrice: number
}

export default function ProCard({
  proId,
  displayName,
  profilePhotoUrl,
  studioAddress,
  availableSlotCount,
  startingPrice,
}: ProCardProps) {
  return (
    <Link
      href={`/book/${proId}`}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
    >
      {/* Avatar */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-secondary">
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
            {displayName.charAt(0)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-foreground">
          {displayName}
        </p>
        <p className="truncate text-xs text-muted-foreground">{studioAddress}</p>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{availableSlotCount} 個可預約時段</span>
          <span className="text-foreground font-medium">
            NT${startingPrice.toLocaleString()} 起
          </span>
        </div>
      </div>
    </Link>
  )
}
