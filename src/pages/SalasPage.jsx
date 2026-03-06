import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Sidebar from '../components/Sidebar'

export default function SalasPage() {
    const [items, setItems] = useState([])
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

            const { data } = await supabase
                .from('salas_media').select('*')
                .order('posted_date', { ascending: false })
            setItems(data || [])
            setLoading(false)
        }
        init()
    }, [navigate])

    const photos = items.filter(i => i.media_type === 'photo')
    const videos = items.filter(i => i.media_type === 'video')

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
                <header className="py-8 px-6 border-b border-[var(--color-border)]">
                    <h1 className="text-3xl font-[var(--font-heading)] text-white tracking-wider">SALAS</h1>
                    <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mt-1">
                        {photos.length} Photos · {videos.length} Videos
                    </p>
                </header>

                <main className="px-6 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Photos column */}
                        <section>
                            <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider mb-4 flex items-center gap-2">
                                <span>📷</span> PHOTOS
                            </h2>
                            {photos.length === 0 ? (
                                <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs">No photos yet</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {photos.map(item => (
                                        <div key={item.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded overflow-hidden">
                                            <div className="aspect-square overflow-hidden">
                                                <img src={item.media_url} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                                            </div>
                                            <div className="p-2">
                                                <p className="text-sm text-white truncate">{item.title}</p>
                                                <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px]">
                                                    {item.posted_date}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Videos column */}
                        <section>
                            <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider mb-4 flex items-center gap-2">
                                <span>🎬</span> VIDEOS
                            </h2>
                            {videos.length === 0 ? (
                                <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs">No videos yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {videos.map(item => (
                                        <div key={item.id} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded overflow-hidden">
                                            <video src={item.media_url} controls className="w-full aspect-video" />
                                            <div className="p-2">
                                                <p className="text-sm text-white truncate">{item.title}</p>
                                                <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px]">
                                                    {item.posted_date}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </main>
            </div>
        </>
    )
}
