import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'
import WantedCard from '../components/WantedCard'
import CaseFileModal from '../components/CaseFileModal'

export default function Gallery() {
    const [profiles, setProfiles] = useState([])
    const [announcements, setAnnouncements] = useState([])
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const [selected, setSelected] = useState(null)
    const [showCaseFile, setShowCaseFile] = useState(false)
    const navigate = useNavigate()

    async function fetchProfilesData() {
        const { data: profilesData } = await supabase
            .from('profiles').select('*')
            .order('priority', { ascending: true })
            .order('created_at', { ascending: false })
        setProfiles(profilesData || [])
    }

    useEffect(() => {
        async function init() {
            const { data: lockdownData } = await supabase
                .from('settings').select('value').eq('key', 'lockdown').single()
            const isLockdown = lockdownData?.value === 'true'
            const hasSession = sessionStorage.getItem('ln_access') === 'granted'

            if (isLockdown) {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { navigate('/lockdown', { replace: true }); return }
                const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).single()
                if (!admin) { navigate('/lockdown', { replace: true }); return }
            } else if (!hasSession) {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { navigate('/', { replace: true }); return }
                const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).single()
                if (!admin) { navigate('/', { replace: true }); return }
            }

            setAuthorized(true)

            const [profilesRes, announcementsRes] = await Promise.all([
                supabase.from('profiles').select('*').order('priority', { ascending: true }).order('created_at', { ascending: false }),
                supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5)
            ])

            setProfiles(profilesRes.data || [])
            setAnnouncements(announcementsRes.data || [])

            setLoading(false)
        }
        init()
    }, [navigate])

    if (loading || !authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)]">
                <div className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-sm animate-pulse">Loading...</div>
            </div>
        )
    }

    return (
        <>
            <Sidebar />
            <div className="page-with-sidebar">
                {/* Header */}
                <header className="py-8 px-6 border-b border-[var(--color-border)]">
                    <h1 className="text-3xl md:text-4xl font-[var(--font-heading)] text-white tracking-wider">
                        LISTA NEGRA 2026
                    </h1>
                    <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mt-1 tracking-wider">
                        {profiles.filter(p => !p.captured).length} ACTIVE · {profiles.filter(p => p.captured).length} CAPTURED
                    </p>
                </header>

                <main className="px-6 py-6 space-y-8">
                    {/* Announcements */}
                    {announcements.length > 0 && (
                        <section>
                            <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider mb-3">ANNOUNCEMENTS</h2>
                            <div className="space-y-2">
                                {announcements.map(a => (
                                    <div key={a.id} className="announcement-card">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-white font-[var(--font-body)] font-semibold text-sm">{a.title}</h3>
                                                {a.content && <p className="text-[var(--color-text-muted)] text-xs mt-1">{a.content}</p>}
                                            </div>
                                            <span className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] shrink-0">
                                                {new Date(a.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Detail Panel */}
                    {selected && (
                        <div className="detail-panel">
                            <div className="w-48 shrink-0">
                                <div className="photo-frame rounded">
                                    {selected.photo_url ? (
                                        <img src={selected.photo_url} alt={selected.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] text-xs font-[var(--font-mono)]">NO PHOTO</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-[var(--font-heading)] text-white tracking-wide">{selected.name}</h2>
                                    <button onClick={() => setSelected(null)} className="text-[var(--color-text-muted)] hover:text-white text-sm cursor-pointer bg-transparent border-none">✕</button>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex gap-2">
                                        <span className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs w-16 shrink-0">CRIME:</span>
                                        <span>{selected.crime}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs w-16 shrink-0">REWARD:</span>
                                        <span className="text-[var(--color-gold)]">{selected.reward}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <span className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs w-16 shrink-0">STATUS:</span>
                                        <span className={selected.captured ? 'text-[var(--color-captured)]' : 'text-[var(--color-accent)]'}>
                                            {selected.captured ? 'CAPTURED' : 'AT LARGE'}
                                        </span>
                                    </div>
                                </div>
                                {selected.captured && selected.capture_video_url && (
                                    <div className="mt-2">
                                        <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-2">CAPTURE FOOTAGE:</p>
                                        <video src={selected.capture_video_url} controls className="w-full max-w-md rounded border border-[var(--color-border)]" />
                                    </div>
                                )}

                                <button
                                    onClick={() => setShowCaseFile(true)}
                                    className="btn-primary mt-2 py-3 w-full text-xs tracking-widest bg-[var(--color-surface-light)] border border-[var(--color-border)] hover:border-white transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                                >
                                    OPEN CASE FILE / WARRANT
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Grid */}
                    {profiles.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-sm">No active files</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {profiles.map(profile => (
                                <WantedCard key={profile.id} profile={profile} onClick={setSelected} />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {showCaseFile && selected && (
                <CaseFileModal
                    profile={selected}
                    onClose={() => setShowCaseFile(false)}
                    isAdminInitially={false}
                    onUpdate={async () => {
                        await fetchProfilesData();
                        const updated = profiles.find(p => p.id === selected.id);
                        if (updated) setSelected(updated);
                    }}
                />
            )}
        </>
    )
}
