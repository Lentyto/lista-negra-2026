import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }) {
    const [authorized, setAuthorized] = useState(false)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                navigate('/admin/login', { replace: true })
                return
            }

            const { data: admin } = await supabase
                .from('admins')
                .select('id')
                .eq('id', user.id)
                .single()

            if (!admin) {
                await supabase.auth.signOut()
                navigate('/admin/login', { replace: true })
                return
            }

            setAuthorized(true)
            setLoading(false)
        }
        checkAuth()
    }, [navigate])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-midnight)]">
                <div className="text-[var(--color-danger)] font-[var(--font-mono)] text-lg animate-pulse">
                    VERIFYING CLEARANCE...
                </div>
            </div>
        )
    }

    return authorized ? children : null
}
