import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { uploadToCloudinaryFull } from '../lib/cloudinary'
import { sendTipToWebhook } from '../lib/discord'

const MAX_INBOX = 30

export default function TipForm({ onClose }) {
    const [message, setMessage] = useState('')
    const [imageFile, setImageFile] = useState(null)
    const [sending, setSending] = useState(false)
    const [status, setStatus] = useState('')
    const [blocked, setBlocked] = useState(false)

    useEffect(() => {
        async function checkInbox() {
            const { count } = await supabase
                .from('inbox')
                .select('*', { count: 'exact', head: true })
            if (count >= MAX_INBOX) setBlocked(true)
        }
        checkInbox()
    }, [])

    async function handleSubmit(e) {
        e.preventDefault()
        if (!message.trim() && !imageFile) {
            setStatus('Please enter a message or attach an image.')
            return
        }

        setSending(true)
        setStatus('Sending...')

        try {
            // Re-check inbox count
            const { count } = await supabase
                .from('inbox')
                .select('*', { count: 'exact', head: true })
            if (count >= MAX_INBOX) {
                setBlocked(true)
                setStatus('Inbox is full. Try again later.')
                setSending(false)
                return
            }

            let image_url = null
            let cloudinary_public_id = null
            let cloudinary_resource_type = 'image'

            if (imageFile) {
                setStatus('Uploading image...')
                const result = await uploadToCloudinaryFull(imageFile)
                image_url = result.url
                cloudinary_public_id = result.publicId
                cloudinary_resource_type = result.resourceType
            }

            const { error } = await supabase.from('inbox').insert([{
                message: message.trim() || null,
                image_url,
                cloudinary_public_id,
                cloudinary_resource_type
            }])

            if (error) throw error

            // Forward to Discord tips webhook
            await sendTipToWebhook(message.trim() || null, image_url)

            setStatus('✓ Your tip has been submitted anonymously.')
            setMessage('')
            setImageFile(null)

            // Auto-close after 2 seconds
            setTimeout(() => { if (onClose) onClose() }, 2000)
        } catch (err) {
            setStatus('Error: ' + err.message)
        }
        setSending(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-[var(--font-heading)] text-white tracking-widest text-base">ANONYMOUS TIP LINE</h3>
                    <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-white cursor-pointer bg-transparent border-none text-lg">✕</button>
                </div>

                {blocked ? (
                    <div className="text-center py-8">
                        <p className="text-[var(--color-accent)] font-[var(--font-mono)] text-sm mb-2">INBOX FULL</p>
                        <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs">
                            The inbox has reached its maximum capacity ({MAX_INBOX} tips).
                            <br />Please try again later.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] leading-relaxed">
                            Submit an anonymous tip to the administrators. Your identity will not be recorded.
                            Include a message, photo/evidence, or both.
                        </p>

                        <div>
                            <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mb-1">MESSAGE</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                className="admin-input"
                                rows={4}
                                placeholder="Type your intel here..."
                                maxLength={500}
                            ></textarea>
                            <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-[9px] text-right mt-0.5">{message.length}/500</p>
                        </div>

                        <div>
                            <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mb-1">ATTACH EVIDENCE (optional)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => setImageFile(e.target.files[0])}
                                className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-[var(--color-accent)] file:text-white file:cursor-pointer file:rounded file:text-[10px]"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sending}
                            className="btn-primary w-full py-3 text-xs tracking-widest"
                        >
                            {sending ? 'TRANSMITTING...' : 'SUBMIT TIP'}
                        </button>
                    </form>
                )}

                {status && (
                    <p className="text-[var(--color-gold)] font-[var(--font-mono)] text-xs text-center mt-4">{status}</p>
                )}
            </div>
        </div>
    )
}
