const PRIORITY_LABELS = {
    1: 'TOP PRIORITY',
    2: 'HIGH',
    3: 'WANTED',
    4: 'MODERATE',
    5: 'LOW',
}

export default function WantedCard({ profile, onClick }) {
    const isCaptured = profile.captured
    const priority = profile.priority || 3

    return (
        <div
            className={`wanted-card cursor-pointer ${isCaptured ? 'captured' : ''}`}
            onClick={() => onClick?.(profile)}
        >
            {/* Priority badge */}
            <div className={`priority-badge priority-${priority}`}>
                {PRIORITY_LABELS[priority]}
            </div>

            {/* Captured stamp */}
            {isCaptured && <div className="captured-stamp">CAPTURED</div>}

            {/* Photo */}
            <div className="photo-frame">
                {profile.photo_url ? (
                    <img src={profile.photo_url} alt={profile.name} loading="lazy" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] text-xs font-[var(--font-mono)]">
                        NO PHOTO
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3 space-y-1">
                <h3 className="font-[var(--font-heading)] text-base text-white tracking-wide leading-tight">
                    {profile.name}
                </h3>
                <p className="text-[var(--color-text-muted)] text-sm">{profile.crime}</p>
                <div className="flex items-center justify-between pt-1">
                    <span className="text-[var(--color-gold)] font-[var(--font-mono)] text-xs">
                        {profile.reward}
                    </span>
                    {isCaptured && (
                        <span className="text-[var(--color-captured)] font-[var(--font-mono)] text-xs">
                            CAPTURED
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
