import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { sendWebhookNotification } from '../lib/discord'
import { uploadToCloudinary } from '../lib/cloudinary'
import CaseFileModal from '../components/CaseFileModal'

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [isSuper, setIsSuper] = useState(false)
    const [activeTab, setActiveTab] = useState('profiles')
    const [profiles, setProfiles] = useState([])
    const [pins, setPins] = useState([])
    const [admins, setAdmins] = useState([])
    const [announcements, setAnnouncements] = useState([])
    const [salasItems, setSalasItems] = useState([])
    const [lockdown, setLockdown] = useState(false)
    const [loading, setLoading] = useState(true)
    const [statusMessage, setStatusMessage] = useState('')

    // Profile form
    const [profileForm, setProfileForm] = useState({ name: '', crime: '', reward: '', priority: 3, height: '', remarks: '' })
    const [photoFile, setPhotoFile] = useState(null)
    const [editingProfileId, setEditingProfileId] = useState(null)
    const [selectedProfileForCase, setSelectedProfileForCase] = useState(null)

    // Admin form
    const [adminForm, setAdminForm] = useState({ email: '', password: '' })

    // PIN edits
    const [pinEdits, setPinEdits] = useState({})

    // Capture video
    const [captureVideoFile, setCaptureVideoFile] = useState(null)
    const [capturingProfileId, setCapturingProfileId] = useState(null)

    // Announcement form
    const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' })
    const [editingAnnouncementId, setEditingAnnouncementId] = useState(null)

    // Salas form
    const [salasForm, setSalasForm] = useState({ title: '', posted_date: new Date().toISOString().split('T')[0], media_type: 'photo' })
    const [salasFile, setSalasFile] = useState(null)

    function flash(msg) {
        setStatusMessage(msg)
        setTimeout(() => setStatusMessage(''), 3000)
    }
    const loadData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return navigate('/admin/login', { replace: true })
        setUser(user)

        const { data: adminRow } = await supabase.from('admins').select('is_super').eq('id', user.id).single()
        setIsSuper(adminRow?.is_super || false)

        const { data: profilesData } = await supabase.from('profiles').select('*')
            .order('priority', { ascending: true }).order('created_at', { ascending: false })
        setProfiles(profilesData || [])

        const { data: pinsData } = await supabase.from('pins').select('*')
        setPins(pinsData || [])
        const edits = {}
        pinsData?.forEach(p => { edits[p.id] = p.pin_value })
        setPinEdits(edits)

        const { data: lockdownData } = await supabase.from('settings').select('value').eq('key', 'lockdown').single()
        setLockdown(lockdownData?.value === 'true')

        const { data: announcementsData } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
        setAnnouncements(announcementsData || [])

        const { data: salasData } = await supabase.from('salas_media').select('*').order('posted_date', { ascending: false })
        setSalasItems(salasData || [])

        if (adminRow?.is_super) {
            const { data: adminsData } = await supabase.from('admins').select('*')
            setAdmins(adminsData || [])
        }

        setLoading(false)
    }, [navigate])

    useEffect(() => { loadData() }, [loadData])

    // ── PROFILE CRUD ──
    async function handleAddProfile(e) {
        e.preventDefault()
        let photo_url = null
        if (photoFile) {
            try {
                photo_url = await uploadToCloudinary(photoFile);
            } catch (err) {
                flash('Upload failed: ' + err.message);
                return;
            }
        }
        if (editingProfileId) {
            const updates = {
                name: profileForm.name,
                crime: profileForm.crime,
                reward: profileForm.reward,
                priority: profileForm.priority,
                height: profileForm.height,
                remarks: profileForm.remarks
            }
            if (photo_url) updates.photo_url = photo_url
            const { error } = await supabase.from('profiles').update(updates).eq('id', editingProfileId)
            if (error) { flash('Update failed'); return }
            flash('Profile updated')
            await sendWebhookNotification(user.email, 'Edit Profile', `Edited profile: ${profileForm.name}`, photo_url || null)
            setEditingProfileId(null)
        } else {
            const { error } = await supabase.from('profiles').insert([{ ...profileForm, photo_url }])
            if (error) { flash('Insert failed'); return }
            flash('Profile added')
            await sendWebhookNotification(user.email, 'Add Profile', `Added new profile: ${profileForm.name}`, photo_url || null)
        }
        setProfileForm({ name: '', crime: '', reward: '', priority: 3, height: '', remarks: '' })
        setPhotoFile(null)
        await loadData()
    }

    async function handleDeleteProfile(id, photoUrl) {
        // Cloudinary unauthenticated client-side deletion is not permitted by default.
        // We will just remove it from the database for now.
        // If needed, delete logic could be moved to a secure backend endpoint.
        await supabase.from('profiles').delete().eq('id', id)
        flash('Profile deleted')
        await sendWebhookNotification(user.email, 'Delete Profile', `Deleted profile ID: ${id}`)
        await loadData()
    }

    function startEditProfile(p) {
        setEditingProfileId(p.id)
        setProfileForm({
            name: p.name,
            crime: p.crime,
            reward: p.reward,
            priority: p.priority || 3,
            height: p.height || '',
            remarks: p.remarks || ''
        })
        setActiveTab('profiles')
    }

    async function handleToggleCaptured(profile) {
        const updates = { captured: !profile.captured }
        if (profile.captured) updates.capture_video_url = null
        await supabase.from('profiles').update(updates).eq('id', profile.id)
        flash(!profile.captured ? 'Marked captured' : 'Marked at large')
        await sendWebhookNotification(user.email, 'Toggle Profile Captiva', `Target ID: ${profile.id} state -> ${!profile.captured ? 'Captured' : 'At large'}`)
        setCapturingProfileId(null)
        await loadData()
    }

    async function handleUploadCaptureVideo(profileId) {
        if (!captureVideoFile) { flash('Select a video'); return }

        let videoUrl = null;
        try {
            videoUrl = await uploadToCloudinary(captureVideoFile);
        } catch (err) {
            flash('Upload failed: ' + err.message);
            return;
        }

        await supabase.from('profiles').update({ capture_video_url: videoUrl }).eq('id', profileId)
        flash('Capture video uploaded')
        await sendWebhookNotification(user.email, 'Uploaded Captiva Video', `Video loaded for target ID ${profileId}`, videoUrl)
        setCaptureVideoFile(null)
        setCapturingProfileId(null)
        await loadData()
    }

    // ── PINS ──
    async function handleUpdatePin(pinId) {
        await supabase.from('pins').update({ pin_value: pinEdits[pinId] }).eq('id', pinId)
        flash('PIN updated')
        await sendWebhookNotification(user.email, 'Updated System PIN Code', `PIN ${pinId} modified`)
        await loadData()
    }

    // ── LOCKDOWN ──
    async function handleToggleLockdown() {
        const newVal = !lockdown
        await supabase.from('settings').update({ value: String(newVal) }).eq('key', 'lockdown')
        setLockdown(newVal)
        flash(newVal ? 'Lockdown activated' : 'Lockdown deactivated')
        await sendWebhookNotification(user.email, 'Lockdown System Action', `System lockdown: ${newVal ? 'ENGAGED' : 'DISENGAGED'}`)
    }

    // ── ANNOUNCEMENTS ──
    async function handleAddAnnouncement(e) {
        e.preventDefault()
        if (editingAnnouncementId) {
            await supabase.from('announcements').update(announcementForm).eq('id', editingAnnouncementId)
            flash('Announcement updated')
            await sendWebhookNotification(user.email, 'Update Announcement', `Updated: ${announcementForm.title}`)
            setEditingAnnouncementId(null)
        } else {
            await supabase.from('announcements').insert([announcementForm])
            flash('Announcement posted')
            await sendWebhookNotification(user.email, 'New Announcement', `Posted: ${announcementForm.title}`)
        }
        setAnnouncementForm({ title: '', content: '' })
        await loadData()
    }

    async function handleDeleteAnnouncement(id) {
        await supabase.from('announcements').delete().eq('id', id)
        flash('Announcement deleted')
        await sendWebhookNotification(user.email, 'Delete Announcement', `Erased announcement ID: ${id}`)
        await loadData()
    }

    // ── SALAS UPLOAD ──
    async function handleAddSalasMedia(e) {
        e.preventDefault()
        if (!salasFile) { flash('Select a file'); return }
        let mediaUrl = null;
        try {
            mediaUrl = await uploadToCloudinary(salasFile);
        } catch (err) {
            flash('Upload failed: ' + err.message);
            return;
        }

        await supabase.from('salas_media').insert([{ ...salasForm, media_url: mediaUrl }])
        flash('Uploaded to Salas')
        await sendWebhookNotification(user.email, 'Loaded to Salas', `Title: ${salasForm.title}`, mediaUrl)
        setSalasForm({ title: '', posted_date: new Date().toISOString().split('T')[0], media_type: 'photo' })
        setSalasFile(null)
        await loadData()
    }

    async function handleDeleteSalasItem(item) {
        // Unauthenticated client-side deletion works differently for Cloudinary. We just remove the db record.
        await supabase.from('salas_media').delete().eq('id', item.id)
        flash('Salas item deleted')
        await sendWebhookNotification(user.email, 'Remove Salas Media', `Title: ${item.title} removed`)
        await loadData()
    }

    // ── ADMIN MANAGEMENT ──
    async function handleCreateAdmin(e) {
        e.preventDefault()
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email: adminForm.email, password: adminForm.password })
        if (signUpError) { flash('Failed: ' + signUpError.message); return }
        const { error: insertError } = await supabase.from('admins').insert([{ id: signUpData.user.id, is_super: false }])
        if (insertError) { flash('Admin insert failed'); return }
        flash('Admin created')
        await sendWebhookNotification(user.email, 'New Regional Admin Added', `Email: ${adminForm.email}`)
        setAdminForm({ email: '', password: '' })
        await loadData()
    }

    async function handleDeleteAdmin(adminId) {
        if (adminId === user.id) { flash('Cannot delete yourself'); return }
        await supabase.from('admins').delete().eq('id', adminId)
        flash('Admin removed')
        await sendWebhookNotification(user.email, 'Regional Admin Deleted', `Admin ID Purged: ${adminId}`)
        await loadData()
    }

    async function handleLogout() {
        await sendWebhookNotification(user.email, 'Admin Logout', 'Admin logged out of the dashboard.');
        await supabase.auth.signOut()
        navigate('/', { replace: true })
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-primary)]">
                <div className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-sm animate-pulse">Loading...</div>
            </div>
        )
    }

    const tabs = [
        { key: 'profiles', label: 'Profiles' },
        { key: 'announcements', label: 'News' },
        { key: 'salas', label: 'Salas' },
        { key: 'pins', label: 'PINs' },
        { key: 'lockdown', label: 'Lockdown' },
        ...(isSuper ? [{ key: 'admins', label: 'Admins' }] : []),
    ]

    return (
        <div className="min-h-screen bg-[var(--color-primary)]">
            {/* Top Bar */}
            <header className="bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-base font-[var(--font-heading)] text-white tracking-wider">ADMIN</h1>
                    {isSuper && <span className="text-[var(--color-gold)] font-[var(--font-mono)] text-[10px] border border-[var(--color-gold)] px-1.5 py-0.5 rounded">SUPER</span>}
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs hidden md:block">{user?.email}</span>
                    <button onClick={handleLogout} className="btn-outline text-xs py-1 px-3 cursor-pointer">Logout</button>
                </div>
            </header>

            {statusMessage && (
                <div className="bg-[var(--color-accent)] text-white text-center py-2 font-[var(--font-mono)] text-sm">{statusMessage}</div>
            )}

            {/* Tabs */}
            <nav className="max-w-6xl mx-auto px-4 pt-6 flex gap-1 overflow-x-auto">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 text-sm font-[var(--font-body)] tracking-wider border-b-2 cursor-pointer transition-colors bg-transparent
              ${activeTab === tab.key ? 'text-[var(--color-accent)] border-[var(--color-accent)]' : 'text-[var(--color-text-muted)] border-transparent hover:text-white'}`}>
                        {tab.label}
                    </button>
                ))}
            </nav>

            <main className="max-w-6xl mx-auto px-4 py-6">

                {/* ═══════ PROFILES ═══════ */}
                {activeTab === 'profiles' && (
                    <div className="space-y-6">
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-5">
                            <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider mb-4">{editingProfileId ? 'Edit Profile' : 'Add Profile'}</h2>
                            <form onSubmit={handleAddProfile} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Name</label>
                                    <input type="text" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} className="admin-input" required />
                                </div>
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Reward</label>
                                    <input type="text" value={profileForm.reward} onChange={e => setProfileForm(f => ({ ...f, reward: e.target.value }))} className="admin-input" placeholder="e.g. $50,000" required />
                                </div>
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Crime</label>
                                    <input type="text" value={profileForm.crime} onChange={e => setProfileForm(f => ({ ...f, crime: e.target.value }))} className="admin-input" required />
                                </div>
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Priority</label>
                                    <select value={profileForm.priority} onChange={e => setProfileForm(f => ({ ...f, priority: parseInt(e.target.value) }))} className="admin-input">
                                        <option value={1}>1 — Top Priority</option>
                                        <option value={2}>2 — High</option>
                                        <option value={3}>3 — Wanted</option>
                                        <option value={4}>4 — Moderate</option>
                                        <option value={5}>5 — Low</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Height/Details</label>
                                    <input type="text" value={profileForm.height} onChange={e => setProfileForm(f => ({ ...f, height: e.target.value }))} className="admin-input" placeholder="e.g. 5'11, Unknown" />
                                </div>
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Remarks</label>
                                    <input type="text" value={profileForm.remarks} onChange={e => setProfileForm(f => ({ ...f, remarks: e.target.value }))} className="admin-input" placeholder="e.g. Armed and dangerous" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Photo</label>
                                    <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])}
                                        className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-sm file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-[var(--color-accent)] file:text-white file:font-[var(--font-body)] file:cursor-pointer file:rounded file:text-xs" />
                                </div>
                                <div className="md:col-span-2 flex gap-3">
                                    <button type="submit" className="btn-primary text-xs">{editingProfileId ? 'Save' : 'Add Profile'}</button>
                                    {editingProfileId && (
                                        <button type="button" onClick={() => { setEditingProfileId(null); setProfileForm({ name: '', crime: '', reward: '', priority: 3, height: '', remarks: '' }) }} className="btn-outline text-xs cursor-pointer">Cancel</button>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded overflow-hidden">
                            <div className="p-4 border-b border-[var(--color-border)]">
                                <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider">Profiles ({profiles.length})</h2>
                            </div>
                            {profiles.length === 0 ? (
                                <p className="p-6 text-[var(--color-text-muted)] font-[var(--font-mono)] text-sm text-center">No profiles yet</p>
                            ) : (
                                <div className="divide-y divide-[var(--color-border)]">
                                    {profiles.map(profile => (
                                        <div key={profile.id} className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 shrink-0 bg-[var(--color-surface-light)] rounded overflow-hidden">
                                                    {profile.photo_url ? <img src={profile.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] text-[10px]">?</div>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-white font-[var(--font-body)] font-semibold text-sm truncate">{profile.name}</p>
                                                        <span className={`priority-badge priority-${profile.priority || 3} !static !text-[9px]`}>P{profile.priority || 3}</span>
                                                        {profile.captured && <span className="text-[var(--color-captured)] font-[var(--font-mono)] text-[10px]">CAPTURED</span>}
                                                    </div>
                                                    <p className="text-[var(--color-text-muted)] text-xs truncate">{profile.crime}</p>
                                                </div>
                                                <span className="text-[var(--color-gold)] font-[var(--font-mono)] text-xs shrink-0">{profile.reward}</span>
                                                <div className="flex gap-1.5 shrink-0 flex-wrap">
                                                    <button onClick={() => startEditProfile(profile)} className="text-[var(--color-text-muted)] hover:text-white font-[var(--font-mono)] text-[10px] border border-[var(--color-border)] px-2 py-1 rounded cursor-pointer bg-transparent transition-colors">Edit</button>
                                                    <button onClick={() => handleToggleCaptured(profile)}
                                                        className={`font-[var(--font-mono)] text-[10px] border px-2 py-1 rounded cursor-pointer bg-transparent transition-colors ${profile.captured ? 'text-[var(--color-captured)] border-[var(--color-captured)]' : 'text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>
                                                        {profile.captured ? 'Uncapture' : 'Capture'}
                                                    </button>
                                                    {profile.captured && (
                                                        <button onClick={() => setCapturingProfileId(capturingProfileId === profile.id ? null : profile.id)}
                                                            className="text-[var(--color-text-muted)] hover:text-white font-[var(--font-mono)] text-[10px] border border-[var(--color-border)] px-2 py-1 rounded cursor-pointer bg-transparent transition-colors">Video</button>
                                                    )}
                                                    <button onClick={() => handleDeleteProfile(profile.id, profile.photo_url)} className="text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white font-[var(--font-mono)] text-[10px] border border-[var(--color-accent)] px-2 py-1 rounded cursor-pointer bg-transparent transition-colors">Delete</button>
                                                    <button onClick={() => setSelectedProfileForCase(profile)} className="text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-black font-[var(--font-mono)] text-[10px] border border-[var(--color-gold)] px-2 py-1 rounded cursor-pointer bg-transparent transition-colors">Case File</button>
                                                </div>
                                            </div>
                                            {capturingProfileId === profile.id && (
                                                <div className="mt-3 ml-16 p-3 bg-[var(--color-surface-light)] rounded border border-[var(--color-border)] flex items-center gap-3 flex-wrap">
                                                    <input type="file" accept="video/*" onChange={e => setCaptureVideoFile(e.target.files[0])}
                                                        className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs file:mr-2 file:py-1 file:px-2 file:border-0 file:bg-[var(--color-captured)] file:text-white file:cursor-pointer file:rounded file:text-[10px]" />
                                                    <button onClick={() => handleUploadCaptureVideo(profile.id)} className="btn-primary text-[10px] py-1 px-3">Upload</button>
                                                    {profile.capture_video_url && <span className="text-[var(--color-captured)] font-[var(--font-mono)] text-[10px]">✓ Has video</span>}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════ ANNOUNCEMENTS ═══════ */}
                {activeTab === 'announcements' && (
                    <div className="space-y-6">
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-5">
                            <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider mb-4">{editingAnnouncementId ? 'Edit Announcement' : 'Post Announcement'}</h2>
                            <form onSubmit={handleAddAnnouncement} className="space-y-3">
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Title</label>
                                    <input type="text" value={announcementForm.title} onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))} className="admin-input" required />
                                </div>
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Content (optional)</label>
                                    <textarea value={announcementForm.content} onChange={e => setAnnouncementForm(f => ({ ...f, content: e.target.value }))} className="admin-input" rows={3} />
                                </div>
                                <div className="flex gap-3">
                                    <button type="submit" className="btn-primary text-xs">{editingAnnouncementId ? 'Save' : 'Post'}</button>
                                    {editingAnnouncementId && (
                                        <button type="button" onClick={() => { setEditingAnnouncementId(null); setAnnouncementForm({ title: '', content: '' }) }} className="btn-outline text-xs cursor-pointer">Cancel</button>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded overflow-hidden">
                            <div className="p-4 border-b border-[var(--color-border)]">
                                <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider">Announcements ({announcements.length})</h2>
                            </div>
                            {announcements.length === 0 ? (
                                <p className="p-6 text-[var(--color-text-muted)] font-[var(--font-mono)] text-sm text-center">No announcements</p>
                            ) : (
                                <div className="divide-y divide-[var(--color-border)]">
                                    {announcements.map(a => (
                                        <div key={a.id} className="p-4 flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-[var(--font-body)] font-semibold text-sm">{a.title}</p>
                                                {a.content && <p className="text-[var(--color-text-muted)] text-xs mt-1 line-clamp-2">{a.content}</p>}
                                                <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px] mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex gap-1.5 shrink-0">
                                                <button onClick={() => { setEditingAnnouncementId(a.id); setAnnouncementForm({ title: a.title, content: a.content || '' }) }}
                                                    className="text-[var(--color-text-muted)] hover:text-white font-[var(--font-mono)] text-[10px] border border-[var(--color-border)] px-2 py-1 rounded cursor-pointer bg-transparent transition-colors">Edit</button>
                                                <button onClick={() => handleDeleteAnnouncement(a.id)}
                                                    className="text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white font-[var(--font-mono)] text-[10px] border border-[var(--color-accent)] px-2 py-1 rounded cursor-pointer bg-transparent transition-colors">Delete</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════ SALAS ═══════ */}
                {activeTab === 'salas' && (
                    <div className="space-y-6">
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-5">
                            <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider mb-4">Upload to Salas</h2>
                            <form onSubmit={handleAddSalasMedia} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Title</label>
                                    <input type="text" value={salasForm.title} onChange={e => setSalasForm(f => ({ ...f, title: e.target.value }))} className="admin-input" required />
                                </div>
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Date</label>
                                    <input type="date" value={salasForm.posted_date} onChange={e => setSalasForm(f => ({ ...f, posted_date: e.target.value }))} className="admin-input" required />
                                </div>
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Type</label>
                                    <select value={salasForm.media_type} onChange={e => setSalasForm(f => ({ ...f, media_type: e.target.value }))} className="admin-input">
                                        <option value="photo">Photo</option>
                                        <option value="video">Video</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">File</label>
                                    <input type="file" accept="image/*,video/*" onChange={e => setSalasFile(e.target.files[0])}
                                        className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-sm file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-[var(--color-accent)] file:text-white file:cursor-pointer file:rounded file:text-xs" />
                                </div>
                                <div className="md:col-span-2">
                                    <button type="submit" className="btn-primary text-xs">Upload</button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded overflow-hidden">
                            <div className="p-4 border-b border-[var(--color-border)]">
                                <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider">Salas Items ({salasItems.length})</h2>
                            </div>
                            {salasItems.length === 0 ? (
                                <p className="p-6 text-[var(--color-text-muted)] font-[var(--font-mono)] text-sm text-center">Nothing uploaded to Salas yet</p>
                            ) : (
                                <div className="divide-y divide-[var(--color-border)]">
                                    {salasItems.map(item => (
                                        <div key={item.id} className="p-4 flex items-center gap-4">
                                            <div className="w-16 h-12 shrink-0 bg-[var(--color-surface-light)] rounded overflow-hidden">
                                                {item.media_type === 'photo' ? (
                                                    <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <video src={item.media_url} className="w-full h-full object-cover" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm truncate">{item.title}</p>
                                                <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-[10px]">{item.media_type} · {item.posted_date}</p>
                                            </div>
                                            <button onClick={() => handleDeleteSalasItem(item)}
                                                className="text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white font-[var(--font-mono)] text-[10px] border border-[var(--color-accent)] px-2 py-1 rounded cursor-pointer bg-transparent transition-colors">Delete</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══════ PINS ═══════ */}
                {activeTab === 'pins' && (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-5 space-y-4">
                        <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider">PIN Codes</h2>
                        {pins.map(pin => (
                            <div key={pin.id} className="flex items-center gap-3 p-3 border border-[var(--color-border)] rounded">
                                <span className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs w-16 shrink-0 uppercase">{pin.label}</span>
                                <input type="text" value={pinEdits[pin.id] || ''} onChange={e => setPinEdits(prev => ({ ...prev, [pin.id]: e.target.value }))} className="admin-input max-w-[200px]" maxLength={10} />
                                <button onClick={() => handleUpdatePin(pin.id)} className="btn-primary text-xs py-1.5 px-3">Update</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* ═══════ LOCKDOWN ═══════ */}
                {activeTab === 'lockdown' && (
                    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-6 text-center space-y-5">
                        <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider">Lockdown Mode</h2>
                        <div className={`inline-block px-5 py-2 border rounded font-[var(--font-mono)] text-sm tracking-wider ${lockdown ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-[var(--color-captured)] text-[var(--color-captured)]'}`}>
                            {lockdown ? 'LOCKED' : 'UNLOCKED'}
                        </div>
                        <p className="text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs max-w-md mx-auto">
                            When active, all public pages show a lockdown screen with admin login. Only admins can access the site.
                        </p>
                        <button onClick={handleToggleLockdown}
                            className={`text-sm tracking-wider py-2 px-6 font-[var(--font-body)] font-semibold uppercase border-none rounded cursor-pointer transition-all ${lockdown ? 'bg-[var(--color-captured)] text-white' : 'bg-[var(--color-accent)] text-white'}`}>
                            {lockdown ? 'Deactivate' : 'Activate Lockdown'}
                        </button>
                    </div>
                )}

                {/* ═══════ ADMINS (super only) ═══════ */}
                {activeTab === 'admins' && isSuper && (
                    <div className="space-y-6">
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded p-5">
                            <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider mb-4">Create Admin</h2>
                            <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Email</label>
                                    <input type="email" value={adminForm.email} onChange={e => setAdminForm(f => ({ ...f, email: e.target.value }))} className="admin-input" required />
                                </div>
                                <div>
                                    <label className="block text-[var(--color-text-muted)] font-[var(--font-mono)] text-xs mb-1">Password</label>
                                    <input type="password" value={adminForm.password} onChange={e => setAdminForm(f => ({ ...f, password: e.target.value }))} className="admin-input" minLength={6} required />
                                </div>
                                <div className="md:col-span-2">
                                    <button type="submit" className="btn-primary text-xs">Create Admin</button>
                                </div>
                            </form>
                        </div>
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded overflow-hidden">
                            <div className="p-4 border-b border-[var(--color-border)]">
                                <h2 className="text-sm font-[var(--font-heading)] text-white tracking-wider">Admins ({admins.length})</h2>
                            </div>
                            <div className="divide-y divide-[var(--color-border)]">
                                {admins.map(admin => (
                                    <div key={admin.id} className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-white font-[var(--font-mono)] text-xs">{admin.id.slice(0, 8)}...</span>
                                            {admin.is_super && <span className="text-[var(--color-gold)] font-[var(--font-mono)] text-[10px] border border-[var(--color-gold)] px-1.5 py-0.5 rounded">SUPER</span>}
                                            {admin.id === user.id && <span className="text-[var(--color-captured)] font-[var(--font-mono)] text-[10px]">(you)</span>}
                                        </div>
                                        {!admin.is_super && (
                                            <button onClick={() => handleDeleteAdmin(admin.id)}
                                                className="text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white font-[var(--font-mono)] text-[10px] border border-[var(--color-accent)] px-2 py-1 rounded cursor-pointer bg-transparent transition-colors">Remove</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {selectedProfileForCase && (
                <CaseFileModal
                    profile={selectedProfileForCase}
                    onClose={() => setSelectedProfileForCase(null)}
                    isAdminInitially={true}
                    onUpdate={async () => {
                        await loadData();
                        const updated = profiles.find(p => p.id === selectedProfileForCase.id);
                        if (updated) setSelectedProfileForCase(updated);
                        else setSelectedProfileForCase(null);
                    }}
                />
            )}
        </div>
    )
}
