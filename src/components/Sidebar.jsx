import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import TipForm from './TipForm'

const links = [
    { to: '/gallery', label: 'Most Wanted', icon: '🎯' },
    { to: '/salas', label: 'Salas', icon: '📁' },
    { to: '/media', label: 'Media', icon: '🖼' },
]

export default function Sidebar() {
    const [showTipForm, setShowTipForm] = useState(false)

    return (
        <>
            <aside className="fixed top-0 left-0 h-screen w-[160px] bg-[var(--color-surface)] border-r border-[var(--color-border)] z-30 flex flex-col">
                {/* Logo */}
                <div className="px-4 py-5 border-b border-[var(--color-border)]">
                    <h1 className="font-[var(--font-heading)] text-sm text-white tracking-wider leading-tight">
                        LISTA<br />NEGRA
                    </h1>
                </div>

                {/* Nav links */}
                <nav className="flex-1 py-4 px-2 space-y-0.5">
                    {links.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) =>
                                `flex items-center gap-2.5 px-3 py-2.5 rounded text-xs font-[var(--font-body)] tracking-wider no-underline transition-colors
              ${isActive
                                    ? 'bg-[var(--color-accent)] text-white'
                                    : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface-light)]'
                                }`
                            }
                        >
                            <span className="text-sm">{link.icon}</span>
                            {link.label}
                        </NavLink>
                    ))}

                    {/* Tip Line button */}
                    <button
                        onClick={() => setShowTipForm(true)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded text-xs font-[var(--font-body)] tracking-wider transition-colors w-full text-left cursor-pointer bg-transparent border-none text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface-light)]"
                    >
                        <span className="text-sm">📨</span>
                        Tip Line
                    </button>
                </nav>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-[var(--color-border)]">
                    <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-[9px] tracking-wider">2026</p>
                </div>
            </aside>

            {showTipForm && <TipForm onClose={() => setShowTipForm(false)} />}
        </>
    )
}
