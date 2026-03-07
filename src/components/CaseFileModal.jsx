import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { uploadToCloudinary } from '../lib/cloudinary'
import { hasPermission } from '../lib/permissions'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export default function CaseFileModal({ profile: initialProfile, onClose, onUpdate, isAdminInitially = false }) {
    const [profile, setProfile] = useState(initialProfile)
    const [isAdmin, setIsAdmin] = useState(isAdminInitially)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    // Form state for updating Case File (Admins only)
    const [form, setForm] = useState({
        height: initialProfile.height || '',
        remarks: initialProfile.remarks || ''
    })
    const [photo1, setPhoto1] = useState(null)
    const [photo2, setPhoto2] = useState(null)

    const warrantRef = useRef(null)

    // Re-fetch profile data to get latest
    async function refreshProfile() {
        const { data } = await supabase.from('profiles').select('*').eq('id', profile.id).single()
        if (data) {
            setProfile(data)
            setForm({ height: data.height || '', remarks: data.remarks || '' })
        }
    }

    useEffect(() => {
        // If not already known if admin, check session + granular permissions
        async function checkAdmin() {
            if (isAdminInitially) return
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: admin } = await supabase.from('admins').select('*').eq('id', user.id).single()
                if (admin && hasPermission(admin, 'edit')) {
                    setIsAdmin(true)
                }
            }
        }
        checkAdmin()
    }, [isAdminInitially])
    async function handleSave(e) {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        try {
            const updates = {}
            if (form.height !== undefined) updates.height = form.height
            if (form.remarks !== undefined) updates.remarks = form.remarks

            if (photo1) {
                setMessage('Uploading photo 1...')
                updates.extra_photo_1 = await uploadToCloudinary(photo1)
            }
            if (photo2) {
                setMessage('Uploading photo 2...')
                updates.extra_photo_2 = await uploadToCloudinary(photo2)
            }

            setMessage('Saving...')
            const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)
            if (error) throw error

            // Refresh the profile locally
            await refreshProfile()
            setPhoto1(null)
            setPhoto2(null)
            setMessage('✓ Case file updated successfully')
            if (onUpdate) onUpdate()
        } catch (err) {
            setMessage('Error: ' + err.message)
        }
        setLoading(false)
    }

    async function generatePDF() {
        if (!warrantRef.current) return
        setLoading(true)
        setMessage('Generating warrant PDF...')
        try {
            const canvas = await html2canvas(warrantRef.current, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false
            })
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save(`WARRANT_${profile.name.replace(/\s+/g, '_').toUpperCase()}.pdf`)
            setMessage('✓ Warrant downloaded')
        } catch (err) {
            console.error('PDF generation error:', err)
            setMessage('PDF error: ' + err.message)
        }
        setLoading(false)
    }

    /* ──────────────────────────────────────────────
       ALL styles inside the warrant div use ONLY
       inline styles with hex/rgb colors so that
       html2canvas can parse them (no oklch, no
       CSS variables, no Tailwind classes).
    ────────────────────────────────────────────── */

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.85)', padding: '16px', overflowY: 'auto'
        }}>
            <div style={{
                display: 'flex', flexDirection: 'row', maxWidth: '1100px', width: '100%',
                maxHeight: '90vh', borderRadius: '6px', overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
            }}>

                {/* ═══ PDF PREVIEW (left) ═══ */}
                <div style={{
                    flex: 1, backgroundColor: '#d1d5db', overflowY: 'auto',
                    padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start'
                }}>
                    <div
                        ref={warrantRef}
                        style={{
                            width: '600px', minHeight: '850px', backgroundColor: '#ffffff',
                            color: '#000000', padding: '40px', position: 'relative',
                            fontFamily: "'Times New Roman', Times, serif", boxSizing: 'border-box',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }}
                    >
                        {/* Watermark */}
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            pointerEvents: 'none', opacity: 0.08
                        }}>
                            <div style={{
                                fontSize: '48px', fontWeight: 900, letterSpacing: '6px',
                                transform: 'rotate(-45deg)', color: '#000000',
                                fontFamily: 'Arial, sans-serif'
                            }}>LISTANEGRA2026.COM</div>
                        </div>

                        {/* Header */}
                        <div style={{
                            textAlign: 'center', borderBottom: '4px solid #000000',
                            paddingBottom: '16px', marginBottom: '24px', position: 'relative', zIndex: 1
                        }}>
                            <div style={{ fontSize: '11px', letterSpacing: '4px', color: '#555555', marginBottom: '4px' }}>
                                LISTA NEGRA 2026
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '6px', color: '#333333' }}>
                                OFFICIAL GOVERNMENT RECORD
                            </div>
                            <div style={{
                                fontSize: '52px', fontWeight: 900, marginTop: '8px', marginBottom: '4px',
                                letterSpacing: '8px', color: '#000000', fontFamily: 'Arial Black, Arial, sans-serif'
                            }}>
                                WANTED
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 700, fontStyle: 'italic', color: '#333333' }}>
                                REWARD: {profile.reward}
                            </div>
                        </div>

                        {/* Primary Info */}
                        <div style={{
                            display: 'flex', gap: '24px', marginBottom: '32px',
                            position: 'relative', zIndex: 1
                        }}>
                            <div style={{
                                width: '180px', flexShrink: 0, border: '3px solid #000000',
                                padding: '4px', backgroundColor: '#f3f4f6'
                            }}>
                                {profile.photo_url ? (
                                    <img
                                        src={profile.photo_url}
                                        alt="Mugshot"
                                        crossOrigin="anonymous"
                                        style={{ width: '100%', height: 'auto', display: 'block', filter: 'grayscale(40%)' }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%', aspectRatio: '3/4', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: '#e5e7eb', fontWeight: 700,
                                        fontSize: '14px', color: '#666666'
                                    }}>NO PHOTO</div>
                                )}
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#888888', letterSpacing: '2px' }}>SUBJECT NAME</div>
                                    <div style={{
                                        fontSize: '28px', fontWeight: 900, textTransform: 'uppercase',
                                        borderBottom: '3px solid #000000', display: 'inline-block',
                                        color: '#000000', fontFamily: 'Arial Black, Arial, sans-serif'
                                    }}>{profile.name}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#888888', letterSpacing: '2px' }}>KNOWN CRIMES</div>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#b91c1c' }}>{profile.crime}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '32px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#888888', letterSpacing: '2px' }}>HEIGHT / DETAILS</div>
                                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#000000' }}>{profile.height || 'UNKNOWN'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#888888', letterSpacing: '2px' }}>STATUS</div>
                                        <div style={{
                                            fontSize: '16px', fontWeight: 700,
                                            color: profile.captured ? '#16a34a' : '#b91c1c'
                                        }}>{profile.captured ? 'CAPTURED' : 'AT LARGE'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Remarks */}
                        <div style={{ marginBottom: '32px', position: 'relative', zIndex: 1 }}>
                            <div style={{
                                fontSize: '10px', fontWeight: 700, color: '#888888',
                                letterSpacing: '2px', borderBottom: '1px solid #000000',
                                marginBottom: '8px', paddingBottom: '4px'
                            }}>REMARKS / ADDITIONAL INTELLIGENCE</div>
                            <div style={{
                                fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#222222'
                            }}>{profile.remarks || 'No additional remarks at this time. Subject is considered unpredictable.'}</div>
                        </div>

                        {/* Extra Photos */}
                        {(profile.extra_photo_1 || profile.extra_photo_2) && (
                            <div style={{ marginBottom: '32px', position: 'relative', zIndex: 1 }}>
                                <div style={{
                                    fontSize: '10px', fontWeight: 700, color: '#888888',
                                    letterSpacing: '2px', borderBottom: '1px solid #000000',
                                    marginBottom: '12px', paddingBottom: '4px'
                                }}>ADDITIONAL EVIDENCE</div>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    {profile.extra_photo_1 && (
                                        <div style={{ width: '50%', border: '3px solid #000000', padding: '4px', backgroundColor: '#f3f4f6' }}>
                                            <img src={profile.extra_photo_1} crossOrigin="anonymous" style={{ width: '100%', height: 'auto', display: 'block', filter: 'grayscale(30%)' }} alt="Evidence 1" />
                                        </div>
                                    )}
                                    {profile.extra_photo_2 && (
                                        <div style={{ width: '50%', border: '3px solid #000000', padding: '4px', backgroundColor: '#f3f4f6' }}>
                                            <img src={profile.extra_photo_2} crossOrigin="anonymous" style={{ width: '100%', height: 'auto', display: 'block', filter: 'grayscale(30%)' }} alt="Evidence 2" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{
                            position: 'absolute', bottom: '16px', left: 0, right: 0,
                            textAlign: 'center', fontSize: '9px', color: '#aaaaaa',
                            letterSpacing: '2px', fontFamily: 'monospace'
                        }}>
                            ISSUED BY LISTANEGRA2026.COM · DO NOT APPROACH
                        </div>
                    </div>
                </div>

                {/* ═══ CONTROLS (right sidebar) ═══ */}
                <div className="bg-[var(--color-surface)] border-l border-[var(--color-border)] p-5 flex flex-col overflow-y-auto"
                    style={{ width: '320px', flexShrink: 0 }}>

                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-[var(--font-heading)] text-white tracking-widest text-lg">CASE FILE</h3>
                        <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white cursor-pointer transition-colors text-xl bg-transparent border-none">✕</button>
                    </div>

                    <button
                        onClick={generatePDF}
                        disabled={loading}
                        className="btn-primary w-full mb-6 py-3 tracking-widest"
                    >
                        {loading ? 'PROCESSING...' : '⬇ DOWNLOAD WARRANT'}
                    </button>

                    {message && (
                        <p className="text-[var(--color-gold)] font-[var(--font-mono)] text-xs text-center mb-4">{message}</p>
                    )}

                    {isAdmin && (
                        <form onSubmit={handleSave} className="space-y-4 border-t border-[var(--color-border)] pt-5">
                            <h4 className="text-[var(--color-gold)] font-[var(--font-mono)] text-sm mb-2">ADMIN EDIT</h4>

                            <div>
                                <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mb-1">HEIGHT / DETAILS</label>
                                <input type="text" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} className="admin-input" placeholder="e.g. 5'11" />
                            </div>

                            <div>
                                <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mb-1">REMARKS</label>
                                <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} className="admin-input" rows={4} placeholder="Additional intelligence..."></textarea>
                            </div>

                            <div>
                                <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mb-1">
                                    EVIDENCE PHOTO 1 {profile.extra_photo_1 && <span className="text-[var(--color-captured)]">✓ exists</span>}
                                </label>
                                <input type="file" accept="image/*" onChange={e => setPhoto1(e.target.files[0])}
                                    className="text-[10px] text-[var(--color-text-muted)] w-full" />
                            </div>

                            <div>
                                <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mb-1">
                                    EVIDENCE PHOTO 2 {profile.extra_photo_2 && <span className="text-[var(--color-captured)]">✓ exists</span>}
                                </label>
                                <input type="file" accept="image/*" onChange={e => setPhoto2(e.target.files[0])}
                                    className="text-[10px] text-[var(--color-text-muted)] w-full" />
                            </div>

                            <button type="submit" disabled={loading} className="btn-primary w-full py-2 text-xs tracking-wider">
                                {loading ? 'SAVING...' : 'SAVE CASE FILE'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
