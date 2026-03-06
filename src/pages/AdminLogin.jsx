import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendWebhookNotification } from '../lib/discord'

export default function AdminLogin() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    async function handleLogin(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (authError) {
            setError(authError.message)
            setLoading(false)
            return
        }

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

        // Send webhook notification
        await sendWebhookNotification(data.user.email, 'Admin Login', 'Admin successfully logged into the dashboard.');

        navigate('/admin', { replace: true })
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)] px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-[var(--font-heading)] text-white tracking-wider">
                        ADMIN LOGIN
                    </h1>
                    <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mt-2">
                        Authorized personnel only
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">
                            EMAIL
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="admin-input"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">
                            PASSWORD
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="admin-input"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-[var(--color-accent)] font-[var(--font-mono)] text-xs">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full text-sm tracking-widest disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'LOGIN'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs hover:text-white transition-colors cursor-pointer bg-transparent border-none"
                    >
                        ← Back
                    </button>
                </div>
            </div>
        </div>
    )
}
