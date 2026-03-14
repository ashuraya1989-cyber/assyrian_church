"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import { Save, Loader2, Mail, Image as ImageIcon, Shield, Eye, EyeOff } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export default function SettingsPage() {
    const supabase = useMemo(() => {
        try { return createClient() } catch { return null }
    }, [])
    const { t, language } = useLanguage()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [currentUserRole, setCurrentUserRole] = useState("user")
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [showApiKey, setShowApiKey] = useState(false)

    const [settings, setSettings] = useState({
        admin_title:       "",
        admin_logo_url:    "",
        admin_logo_size:   32,
        login_title:       "",
        login_subtitle:    "",
        login_logo_url:    "",
        login_logo_size:   64,
        resend_api_key:    "",
        resend_from_email: "",
        resend_from_name:  "Kyrkoregistret",
    })

    const [uploadingAdmin, setUploadingAdmin] = useState(false)
    const [uploadingLogin, setUploadingLogin] = useState(false)

    useEffect(() => {
        if (!supabase) return
        const init = async () => {
            // Check role
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user?.id) {
                    const { data } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
                    if (data?.role) setCurrentUserRole(data.role)
                }
            } catch { /* ignore */ }

            // Fetch settings
            try {
                const { data } = await supabase.from('app_settings').select('*').eq('id', 1).single()
                if (data) {
                    setSettings({
                        admin_title:       data.admin_title       ?? "",
                        admin_logo_url:    data.admin_logo_url    ?? "",
                        admin_logo_size:   data.admin_logo_size   ?? 32,
                        login_title:       data.login_title       ?? "",
                        login_subtitle:    data.login_subtitle    ?? "",
                        login_logo_url:    data.login_logo_url    ?? "",
                        login_logo_size:   data.login_logo_size   ?? 64,
                        resend_api_key:    data.resend_api_key    ?? "",
                        resend_from_email: data.resend_from_email ?? "",
                        resend_from_name:  data.resend_from_name  ?? "Kyrkoregistret",
                    })
                }
            } catch { /* ignore */ }

            setLoading(false)
        }
        init()
    }, [supabase])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!supabase) return
        setSaving(true)
        setMessage(null)
        try {
            const { error } = await supabase.from('app_settings').upsert({
                id: 1,
                ...settings,
                updated_at: new Date().toISOString(),
            })
            if (error) throw error
            setMessage({ type: 'success', text: t('page.settings.saved') })
            setTimeout(() => window.location.reload(), 1200)
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message ?? t('page.settings.error') })
        } finally {
            setSaving(false)
        }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'admin' | 'login') => {
        if (!supabase) return
        const file = event.target.files?.[0]
        if (!file) return

        // Server-side type validation
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setMessage({ type: 'error', text: language === 'sv' ? 'Ogiltig filtyp. Tillåtna: JPG, PNG, GIF, WebP, SVG.' : 'Invalid file type. Allowed: JPG, PNG, GIF, WebP, SVG.' })
            return
        }
        if (file.size > MAX_FILE_SIZE) {
            setMessage({ type: 'error', text: language === 'sv' ? 'Filen är för stor (max 2MB).' : 'File too large (max 2MB).' })
            return
        }

        if (type === 'admin') setUploadingAdmin(true)
        else setUploadingLogin(true)

        try {
            const ext = file.name.split('.').pop()
            const path = `logo/${type}_logo_${Date.now()}.${ext}`
            const { error } = await supabase.storage.from('public_assets').upload(path, file, { upsert: true })
            if (error) throw error
            const { data } = supabase.storage.from('public_assets').getPublicUrl(path)
            setSettings(prev => ({
                ...prev,
                [type === 'admin' ? 'admin_logo_url' : 'login_logo_url']: data.publicUrl,
            }))
            setMessage({ type: 'success', text: language === 'sv' ? 'Logotyp uppladdad!' : 'Logo uploaded!' })
        } catch (err: any) {
            setMessage({ type: 'error', text: `Upload failed: ${err.message}` })
        } finally {
            if (type === 'admin') setUploadingAdmin(false)
            else setUploadingLogin(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="animate-spin" size={20} />
                    {t('common.loading')}
                </div>
            </div>
        )
    }

    if (currentUserRole === 'user') {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <Shield size={48} style={{ color: '#DDD8CE' }} className="mx-auto mb-4" />
                    <h2 className="text-xl font-bold">{language === 'sv' ? 'Åtkomst nekad' : 'Access denied'}</h2>
                    <p className="text-muted-foreground mt-2">{language === 'sv' ? 'Du måste vara admin för att ändra inställningar.' : 'You must be admin to change settings.'}</p>
                </div>
            </div>
        )
    }

    const set = (k: string, v: any) => setSettings(prev => ({ ...prev, [k]: v }))

    return (
        <div className="max-w-4xl">
            <div className="page-header">
                <h1 className="text-2xl font-bold tracking-tight">{t('page.settings.title')}</h1>
                <p className="text-muted-foreground text-sm mt-1">{t('page.settings.desc')}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {message && (
                    <div className={`p-4 rounded-[10px] text-sm border font-medium ${
                        message.type === 'success'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                        {message.text}
                    </div>
                )}

                {/* Admin panel settings */}
                <SectionCard icon={<ImageIcon size={16} />} title={t('page.settings.admin_section')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">{language === 'sv' ? 'Sidtitel / Företagsnamn' : 'Page title / Organization name'}</label>
                            <input className="input-premium" value={settings.admin_title} onChange={(e) => set('admin_title', e.target.value)} placeholder="Kyrkoregistret" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">{language === 'sv' ? 'Logotyp storlek (px)' : 'Logo size (px)'}</label>
                            <input type="range" min="16" max="100" value={settings.admin_logo_size} onChange={(e) => set('admin_logo_size', Number(e.target.value))} className="w-full mt-3" />
                            <div className="text-xs text-muted-foreground">{settings.admin_logo_size}px</div>
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold">{t('page.settings.upload_logo')} ({language === 'sv' ? 'adminpanelen' : 'admin panel'})</label>
                            <div className="flex items-center gap-3">
                                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                                    onChange={(e) => handleFileUpload(e, 'admin')} disabled={uploadingAdmin}
                                    className="input-premium cursor-pointer" />
                                {uploadingAdmin && <Loader2 className="animate-spin" size={16} />}
                            </div>
                            <p className="text-xs text-muted-foreground">{language === 'sv' ? 'Max 2MB. JPG, PNG, GIF, WebP, SVG tillåtna.' : 'Max 2MB. JPG, PNG, GIF, WebP, SVG allowed.'}</p>
                            {settings.admin_logo_url && (
                                <img src={settings.admin_logo_url} alt="Admin logo" style={{ height: settings.admin_logo_size }}
                                    className="mt-2 rounded-lg object-contain border border-border p-2 bg-secondary"
                                    onError={(e) => (e.currentTarget.style.display = 'none')} />
                            )}
                        </div>
                    </div>
                </SectionCard>

                {/* Login page settings */}
                <SectionCard icon={<ImageIcon size={16} />} title={t('page.settings.login_section')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">{language === 'sv' ? 'Huvudrubrik' : 'Main heading'}</label>
                            <input className="input-premium" value={settings.login_title} onChange={(e) => set('login_title', e.target.value)} placeholder="Välkommen" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">{language === 'sv' ? 'Underrubrik' : 'Subtitle'}</label>
                            <input className="input-premium" value={settings.login_subtitle} onChange={(e) => set('login_subtitle', e.target.value)} placeholder="Logga in på kyrkoregistret" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">{language === 'sv' ? 'Logotyp storlek (px)' : 'Logo size (px)'}</label>
                            <input type="range" min="32" max="200" value={settings.login_logo_size} onChange={(e) => set('login_logo_size', Number(e.target.value))} className="w-full mt-3" />
                            <div className="text-xs text-muted-foreground">{settings.login_logo_size}px</div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">{t('page.settings.upload_logo')} ({language === 'sv' ? 'inloggning' : 'login'})</label>
                            <div className="flex items-center gap-3">
                                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                                    onChange={(e) => handleFileUpload(e, 'login')} disabled={uploadingLogin}
                                    className="input-premium cursor-pointer" />
                                {uploadingLogin && <Loader2 className="animate-spin" size={16} />}
                            </div>
                            {settings.login_logo_url && (
                                <img src={settings.login_logo_url} alt="Login logo" style={{ height: settings.login_logo_size }}
                                    className="mt-2 rounded-lg object-contain border border-border p-2 bg-secondary"
                                    onError={(e) => (e.currentTarget.style.display = 'none')} />
                            )}
                        </div>
                    </div>
                </SectionCard>

                {/* Resend email settings */}
                <SectionCard icon={<Mail size={16} />} title={t('page.settings.email_section')}>
                    <p className="text-sm text-muted-foreground mb-4">{t('page.settings.resend_desc')}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-sm font-semibold">{t('page.settings.resend_api_key')}</label>
                            <div className="relative">
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    className="input-premium pr-10 font-mono text-sm"
                                    value={settings.resend_api_key}
                                    onChange={(e) => set('resend_api_key', e.target.value)}
                                    placeholder="re_..."
                                    autoComplete="new-password"
                                />
                                <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {language === 'sv'
                                    ? 'Hämta din API-nyckel från resend.com/api-keys'
                                    : 'Get your API key from resend.com/api-keys'}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">{t('page.settings.resend_from_email')}</label>
                            <input type="email" className="input-premium" value={settings.resend_from_email}
                                onChange={(e) => set('resend_from_email', e.target.value)}
                                placeholder="noreply@dinkyrka.se" />
                            <p className="text-xs text-muted-foreground">
                                {language === 'sv' ? 'Måste vara verifierad domän i Resend.' : 'Must be a verified domain in Resend.'}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">{t('page.settings.resend_from_name')}</label>
                            <input className="input-premium" value={settings.resend_from_name}
                                onChange={(e) => set('resend_from_name', e.target.value)}
                                placeholder="Kyrkoregistret" />
                        </div>
                    </div>
                </SectionCard>

                {/* Save button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-[10px] font-semibold text-primary-foreground disabled:opacity-60 transition-all"
                        style={{ background: saving ? '#6B6355' : '#1A1A1A' }}
                    >
                        {saving ? (
                            <><Loader2 className="animate-spin" size={16} /> {language === 'sv' ? 'Sparar...' : 'Saving...'}</>
                        ) : (
                            <><Save size={16} /> {t('page.settings.save')}</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-[14px] overflow-hidden shadow-sm">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border font-semibold text-sm"
                style={{ background: '#F7F3EC' }}>
                <span style={{ color: '#C9A84C' }}>{icon}</span>
                {title}
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    )
}
