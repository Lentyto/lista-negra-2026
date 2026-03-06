import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PinEntry() {
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)
    const [shaking, setShaking] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        async function checkLockdown() {
            const { data } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'lockdown')
                .single()
            if (data?.value === 'true') navigate('/lockdown', { replace: true })
            setLoading(false)
        }
        checkLockdown()
    }, [navigate])

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        const { data: pins } = await supabase
            .from('pins')
            .select('label, pin_value')

        if (!pins || pins.length === 0) {
            setError('System error')
            return
        }

        const galleryPin = pins.find(p => p.label === 'gallery')
        const adminPin = pins.find(p => p.label === 'admin')

        if (pin === galleryPin?.pin_value) {
            sessionStorage.setItem('ln_access', 'granted')
            navigate('/gallery')
        } else if (pin === adminPin?.pin_value) {
            navigate('/admin/login')
        } else {
            setError('Invalid access code')
            setShaking(true)
            setTimeout(() => setShaking(false), 500)
            setPin('')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)]">
                <div className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-sm animate-pulse">
                    Connecting...
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)] px-4">
            <div className="text-center w-full max-w-sm">
                {/* Title */}
                <h1 className="text-4xl font-[var(--font-heading)] text-white tracking-wider mb-2">
                    LISTA NEGRA
                </h1>
                <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs tracking-wider mb-10">
                    Enter access code
                </p>

                {/* PIN Form */}
                <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5">
                    <div style={shaking ? { animation: 'shake 0.5s ease-in-out' } : {}}>
                        <input
                            type="password"
                            maxLength={4}
                            value={pin}
                            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="● ● ● ●"
                            className="pin-input w-[220px] block"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-[var(--color-accent)] font-[var(--font-mono)] text-xs">
                            {error}
                        </p>
                    )}

                    <button type="submit" className="btn-primary text-sm tracking-widest">
                        ENTER
                    </button>
                </form>
            </div>

            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
        </div>
    )
}
