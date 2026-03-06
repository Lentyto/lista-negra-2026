import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { uploadToCloudinary } from '../lib/cloudinary'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export default function CaseFileModal({ profile, onClose, onUpdate, isAdminInitially = false }) {
    const [isAdmin, setIsAdmin] = useState(isAdminInitially)
    const [pinEntry, setPinEntry] = useState('')
    const [pinError, setPinError] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    // Form state for updating Case File (Admins only)
    const [form, setForm] = useState({
        height: profile.height || '',
        remarks: profile.remarks || ''
    })
    const [photo1, setPhoto1] = useState(null)
    const [photo2, setPhoto2] = useState(null)

    const warrantRef = useRef(null)

    useEffect(() => {
        // If not already known if admin, check
        async function checkAdmin() {
            if (isAdminInitially) return;
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: admin } = await supabase.from('admins').select('id').eq('id', user.id).single()
                if (admin) setIsAdmin(true)
            }
        }
        checkAdmin()
    }, [isAdminInitially])

    async function handlePinSubmit(e) {
        e.preventDefault()
        const { data: pins } = await supabase.from('pins').select('pin_value').eq('label', 'admin').single()
        if (pinEntry === pins?.pin_value) {
            setIsAdmin(true)
            setPinError('')
        } else {
            setPinError('Invalid Admin PIN')
        }
        setPinEntry('')
    }

    async function handleSave(e) {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        try {
            const updates = { height: form.height, remarks: form.remarks }

            if (photo1) updates.extra_photo_1 = await uploadToCloudinary(photo1)
            if (photo2) updates.extra_photo_2 = await uploadToCloudinary(photo2)

            const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id)
            if (error) throw error

            setMessage('Case file updated')
            if (onUpdate) onUpdate()
        } catch (err) {
            setMessage('Error: ' + err.message)
        }
        setLoading(false)
    }

    async function generatePDF() {
        if (!warrantRef.current) return
        setLoading(true)
        try {
            // Give time for images to fully load if possible
            const canvas = await html2canvas(warrantRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            })
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save(`WARRANT_${profile.name.replace(/\s+/g, '_').toUpperCase()}.pdf`)
        } catch (err) {
            console.error(err)
            alert('Failed to generate PDF')
        }
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded w-full max-w-4xl flex flex-col md:flex-row shadow-2xl overflow-hidden my-auto max-h-[90vh]">

                {/* PDF PREVIEW SECTION */}
                <div className="flex-1 bg-gray-200 overflow-y-auto p-4 flex justify-center items-start">
                    <div
                        ref={warrantRef}
                        className="bg-white text-black p-8 shadow-lg relative"
                        style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}
                    >
                        {/* Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                            <h1 className="text-6xl font-black rotate-[-45deg] tracking-widest text-black">LISTANEGRA2026.COM</h1>
                        </div>

                        {/* Warrant Header */}
                        <div className="text-center border-b-4 border-black pb-4 mb-6 relative z-10">
                            <h2 className="text-xl font-bold tracking-widest">OFFICIAL GOVERNMENT RECORD</h2>
                            <h1 className="text-5xl font-black mt-2 mb-1 tracking-tighter">WANTED</h1>
                            <h3 className="text-xl font-bold italic">REWARD: {profile.reward}</h3>
                        </div>

                        {/* Primary Info */}
                        <div className="flex gap-6 mb-8 relative z-10">
                            <div className="w-1/3 border-2 border-black p-1 bg-gray-100">
                                {profile.photo_url ? (
                                    <img src={profile.photo_url} alt="Mugshot" className="w-full h-auto object-cover border border-black grayscale-[50%]" />
                                ) : (
                                    <div className="w-full aspect-[3/4] flex items-center justify-center border border-black bg-gray-200 font-bold">NO PHOTO</div>
                                )}
                            </div>
                            <div className="w-2/3 flex flex-col justify-center space-y-4">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase">SUBJECT NAME</p>
                                    <p className="text-3xl font-black uppercase border-b-2 border-black inline-block">{profile.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase">KNOWN CRIMES</p>
                                    <p className="text-xl font-bold text-red-700">{profile.crime}</p>
                                </div>
                                <div className="flex gap-8">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase">HEIGHT / DETAILS</p>
                                        <p className="text-lg font-semibold">{profile.height || 'UNKNOWN'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500 uppercase">STATUS</p>
                                        <p className="text-lg font-bold">{profile.captured ? 'CAPTURED' : 'AT LARGE'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Remarks */}
                        <div className="mb-8 relative z-10">
                            <p className="text-xs font-bold text-gray-500 uppercase border-b border-black mb-2">REMARKS / ADDITIONAL INTELLIGENCE</p>
                            <p className="font-serif text-sm leading-relaxed whitespace-pre-wrap">{profile.remarks || 'No additional remarks at this time. Subject is considered unpredictable.'}</p>
                        </div>

                        {/* Extra Photos */}
                        {(profile.extra_photo_1 || profile.extra_photo_2) && (
                            <div className="mb-8 relative z-10">
                                <p className="text-xs font-bold text-gray-500 uppercase border-b border-black mb-3">ADDITIONAL EVIDENCE</p>
                                <div className="flex gap-4">
                                    {profile.extra_photo_1 && (
                                        <div className="w-1/2 border-2 border-black p-1 bg-gray-100">
                                            <img src={profile.extra_photo_1} crossOrigin="anonymous" className="w-full h-auto object-cover grayscale-[30%]" alt="Evidence 1" />
                                        </div>
                                    )}
                                    {profile.extra_photo_2 && (
                                        <div className="w-1/2 border-2 border-black p-1 bg-gray-100">
                                            <img src={profile.extra_photo_2} crossOrigin="anonymous" className="w-full h-auto object-cover grayscale-[30%]" alt="Evidence 2" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Footer watermark */}
                        <div className="absolute bottom-4 left-0 right-0 text-center font-mono text-[10px] text-gray-400">
                            ISSUED BY LISTANEGRA2026.COM • DO NOT APPROACH
                        </div>
                    </div>
                </div>

                {/* CONTROLS SECTION */}
                <div className="w-full md:w-80 bg-[var(--color-surface)] border-l border-[var(--color-border)] p-5 flex flex-col overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-[var(--font-heading)] text-white tracking-widest text-lg">CASE FILE</h3>
                        <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white cursor-pointer transition-colors text-xl">✕</button>
                    </div>

                    <button
                        onClick={generatePDF}
                        disabled={loading}
                        className="btn-primary w-full mb-8 py-3 tracking-widest"
                    >
                        {loading ? 'PROCESSING...' : 'DOWNLOAD WARRANT'}
                    </button>

                    {isAdmin ? (
                        <form onSubmit={handleSave} className="space-y-4 border-t border-[var(--color-border)] pt-6">
                            <h4 className="text-[var(--color-gold)] font-[var(--font-mono)] text-sm mb-4">ADMIN EDIT</h4>

                            <div>
                                <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mb-1">HEIGHT / DETAILS</label>
                                <input type="text" value={form.height} onChange={e => setForm({ ...form, height: e.target.value })} className="admin-input" />
                            </div>

                            <div>
                                <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mb-1">REMARKS</label>
                                <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} className="admin-input h-24 whitespace-pre-wrap"></textarea>
                            </div>

                            <div>
                                <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mb-1">EVIDENCE PHOTO 1 {profile.extra_photo_1 && '(Exists)'}</label>
                                <input type="file" accept="image/*" onChange={e => setPhoto1(e.target.files[0])} className="text-[10px] text-[var(--color-text-muted)] w-full" />
                            </div>

                            <div>
                                <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mb-1">EVIDENCE PHOTO 2 {profile.extra_photo_2 && '(Exists)'}</label>
                                <input type="file" accept="image/*" onChange={e => setPhoto2(e.target.files[0])} className="text-[10px] text-[var(--color-text-muted)] w-full" />
                            </div>

                            <button type="submit" disabled={loading} className="btn-outline w-full py-2 text-xs">
                                {loading ? 'SAVING...' : 'SAVE ENHANCEMENTS'}
                            </button>

                            {message && <p className="text-[var(--color-gold)] font-[var(--font-mono)] text-xs text-center mt-2">{message}</p>}
                        </form>
                    ) : (
                        <div className="border-t border-[var(--color-border)] pt-6 mt-auto">
                            <h4 className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mb-3">ADMIN OVERRIDE:</h4>
                            <form onSubmit={handlePinSubmit} className="flex gap-2">
                                <input
                                    type="password"
                                    placeholder="PIN"
                                    value={pinEntry}
                                    onChange={e => setPinEntry(e.target.value)}
                                    maxLength={4}
                                    className="admin-input flex-1 !text-center tracking-[0.5em]"
                                />
                                <button type="submit" className="btn-outline text-[10px] px-3">UNLOCK</button>
                            </form>
                            {pinError && <p className="text-[var(--color-accent)] font-[var(--font-mono)] text-[10px] mt-2">{pinError}</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
