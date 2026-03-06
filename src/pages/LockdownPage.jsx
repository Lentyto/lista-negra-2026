import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendWebhookNotification } from '../lib/discord'

export default function LockdownPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [loggedIn, setLoggedIn] = useState(false)
    const navigate = useNavigate()

    async function handleLogin(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

        if (authError) {
            setError(authError.message)
            setLoading(false)
            return
        }

        // Verify admin
        const { data: admin } = await supabase
            .from('admins')
            .select('id')
            .eq('id', data.user.id)
            .single()

        if (!admin) {
            setError('Not authorized')
            await supabase.auth.signOut()
            setLoading(false)
            return
        }

        // Grant gallery access for this session
        sessionStorage.setItem('ln_access', 'granted')
        await sendWebhookNotification(data.user.email, 'Lockdown Login', 'Admin successfully logged in during lockdown mode.');
        setLoggedIn(true)
        setLoading(false)
    }

    // After login — show choice
    if (loggedIn) {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                {/* Red bar */}
                <div className="lockdown-bar bg-[var(--color-accent)] py-3">
                    <p className="text-center text-white font-[var(--font-heading)] text-base tracking-[0.2em]">
                        SITE IN LOCKDOWN
                    </p>
                </div>

                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="text-center space-y-6">
                        <p className="text-gray-800 font-[var(--font-body)] text-lg">Welcome, admin. Where do you want to go?</p>
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => navigate('/gallery')}
                                className="bg-gray-800 text-white font-[var(--font-body)] text-sm tracking-wider py-3 px-8 rounded cursor-pointer border-none hover:bg-gray-700 transition-colors"
                            >
                                Gallery
                            </button>
                            <button
                                onClick={() => navigate('/admin')}
                                className="bg-[var(--color-accent)] text-white font-[var(--font-body)] text-sm tracking-wider py-3 px-8 rounded cursor-pointer border-none hover:opacity-90 transition-opacity"
                            >
                                Admin Panel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Top red bar */}
            <div className="lockdown-bar bg-[var(--color-accent)] py-4">
                <p className="text-center text-white font-[var(--font-heading)] text-xl md:text-2xl tracking-[0.2em]">
                    ⚠ PAGE IN LOCKDOWN: NO ACCESS ⚠
                </p>
            </div>

            {/* Login form in center */}
            <div className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-xs">
                    <h2 className="text-gray-800 font-[var(--font-heading)] text-lg text-center mb-6 tracking-wider">
                        ADMIN LOGIN
                    </h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-gray-500 font-[var(--font-mono)] text-xs mb-1">EMAIL</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800 font-[var(--font-mono)] text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 font-[var(--font-mono)] text-xs mb-1">PASSWORD</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-800 font-[var(--font-mono)] text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
                                required
                            />
                        </div>
                        {error && (
                            <p className="text-[var(--color-accent)] font-[var(--font-mono)] text-xs">{error}</p>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[var(--color-accent)] text-white font-[var(--font-body)] text-sm tracking-wider py-2.5 rounded cursor-pointer border-none hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'LOGIN'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Bottom red bar */}
            <div className="lockdown-bar bg-[var(--color-accent)] py-4">
                <p className="text-center text-white font-[var(--font-heading)] text-xl md:text-2xl tracking-[0.2em]">
                    ⚠ PAGE IN LOCKDOWN: NO ACCESS ⚠
                </p>
            </div>
        </div>
    )
}
