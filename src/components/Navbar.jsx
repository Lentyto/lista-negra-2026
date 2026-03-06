import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false)
    const location = useLocation()

    const links = [
        { to: '/gallery', label: 'Most Wanted' },
        { to: '/media', label: 'Media' },
    ]

    return (
        <>
            {/* Top nav bar */}
            <nav className="fixed top-0 left-0 w-full z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
                    {/* Hamburger */}
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`flex flex-col gap-[5px] p-2 cursor-pointer ${menuOpen ? 'hamburger-open' : ''}`}
                        aria-label="Menu"
                    >
                        <span className="hamburger-line" />
                        <span className="hamburger-line" />
                        <span className="hamburger-line" />
                    </button>

                    {/* Title */}
                    <Link to="/gallery" className="font-[var(--font-heading)] text-lg text-[var(--color-text)] tracking-wider no-underline">
                        LISTA NEGRA
                    </Link>

                    {/* Spacer */}
                    <div className="w-10" />
                </div>
            </nav>

            {/* Slide-out menu */}
            <div
                className={`nav-menu fixed top-14 left-0 w-64 h-[calc(100vh-3.5rem)] bg-[var(--color-surface)] border-r border-[var(--color-border)] z-30 ${menuOpen ? 'open' : ''}`}
            >
                <div className="p-6 space-y-1">
                    {links.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setMenuOpen(false)}
                            className={`block py-3 px-4 rounded text-sm font-[var(--font-body)] tracking-wider no-underline transition-colors
                ${location.pathname === link.to
                                    ? 'bg-[var(--color-accent)] text-white'
                                    : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface-light)]'
                                }`}
                        >
                            {link.label.toUpperCase()}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Overlay to close menu */}
            {menuOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/40"
                    onClick={() => setMenuOpen(false)}
                />
            )}
        </>
    )
}
