import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

export default function MediaPage() {
    const [media, setMedia] = useState([])
    const [loading, setLoading] = useState(true)
    const [authorized, setAuthorized] = useState(false)
    const navigate = useNavigate()

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

            // Gather ALL media from profiles + salas
            const allMedia = []

            const { data: profiles } = await supabase
                .from('profiles').select('name, photo_url, capture_video_url, captured, created_at')
            for (const p of (profiles || [])) {
                if (p.photo_url) allMedia.push({ type: 'photo', url: p.photo_url, title: p.name, source: 'Profile', date: p.created_at })
                if (p.capture_video_url) allMedia.push({ type: 'video', url: p.capture_video_url, title: p.name + ' — Capture', source: 'Capture', date: p.created_at })
            }

            const { data: salasItems } = await supabase
                .from('salas_media').select('*')
            for (const s of (salasItems || [])) {
                allMedia.push({ type: s.media_type, url: s.media_url, title: s.title, source: 'Salas', date: s.posted_date })
            }

            // Sort by date descending
            allMedia.sort((a, b) => new Date(b.date) - new Date(a.date))
            setMedia(allMedia)
            setLoading(false)
        }
        init()
    }, [navigate])

    if (loading || !authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)]">
                <div className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-sm animate-pulse">Loading media...</div>
            </div>
        )
    }

    return (
        <>
            <Sidebar />
            <div className="page-with-sidebar">
                <header className="py-8 px-6 border-b border-[var(--color-border)]">
                    <h1 className="text-3xl font-[var(--font-heading)] text-white tracking-wider">MEDIA</h1>
                    <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mt-1">{media.length} FILES — ALL SOURCES</p>
                </header>

                <main className="px-6 py-6">
                    {media.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-sm">No media yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {media.map((item, idx) => (
                                <div key={idx} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded overflow-hidden">
                                    {item.type === 'photo' ? (
                                        <div className="aspect-square overflow-hidden">
                                            <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="aspect-video overflow-hidden bg-black">
                                            <video src={item.url} controls className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="p-2">
                                        <p className="text-sm text-white truncate">{item.title}</p>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] uppercase">{item.source}</span>
                                            <span className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px]">{item.type}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </>
    )
}
