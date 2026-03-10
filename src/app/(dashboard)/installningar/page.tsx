"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Save, Loader2, Image as ImageIcon, Upload } from "lucide-react"

export default function SettingsPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const [settings, setSettings] = useState({
        admin_title: "",
        admin_logo_url: "",
        admin_logo_size: 32,
        login_title: "",
        login_subtitle: "",
        login_logo_url: "",
        login_logo_size: 64
    })

    // File upload states
    const [uploadingAdmin, setUploadingAdmin] = useState(false)
    const [uploadingLogin, setUploadingLogin] = useState(false)

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).single()
            if (data) {
                setSettings({
                    admin_title: data.admin_title || "",
                    admin_logo_url: data.admin_logo_url || "",
                    admin_logo_size: data.admin_logo_size || 32,
                    login_title: data.login_title || "",
                    login_subtitle: data.login_subtitle || "",
                    login_logo_url: data.login_logo_url || "",
                    login_logo_size: data.login_logo_size || 64
                })
            }
            setLoading(false)
        }
        fetchSettings()
    }, [supabase])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage(null)

        try {
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    id: 1,
                    admin_title: settings.admin_title,
                    admin_logo_url: settings.admin_logo_url,
                    admin_logo_size: settings.admin_logo_size,
                    login_title: settings.login_title,
                    login_subtitle: settings.login_subtitle,
                    login_logo_url: settings.login_logo_url,
                    login_logo_size: settings.login_logo_size,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error
            setMessage({ type: 'success', text: 'Inställningarna har sparats!' })

            // Reload window to apply settings to sidebar immediately
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Ett fel uppstod vid sparandet.' })
        } finally {
            setSaving(false)
        }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'admin' | 'login') => {
        try {
            if (!event.target.files || event.target.files.length === 0) {
                return
            }
            const file = event.target.files[0]
            const fileExt = file.name.split('.').pop()
            const fileName = `${type}_logo_${Date.now()}.${fileExt}`
            const filePath = `logo/${fileName}`

            if (type === 'admin') setUploadingAdmin(true)
            if (type === 'login') setUploadingLogin(true)

            // Upload the file to the 'public_assets' bucket
            const { error: uploadError } = await supabase.storage
                .from('public_assets')
                .upload(filePath, file, { upsert: true })

            if (uploadError) {
                throw uploadError
            }

            // Get the public URL
            const { data } = supabase.storage.from('public_assets').getPublicUrl(filePath)

            if (type === 'admin') {
                setSettings({ ...settings, admin_logo_url: data.publicUrl })
            } else {
                setSettings({ ...settings, login_logo_url: data.publicUrl })
            }

            setMessage({ type: 'success', text: `Logotypen för ${type === 'admin' ? 'adminpanelen' : 'inloggningssidan'} har laddats upp.` })

        } catch (error: any) {
            setMessage({ type: 'error', text: `Uppladdning misslyckades: ${error.message}` })
        } finally {
            if (type === 'admin') setUploadingAdmin(false)
            if (type === 'login') setUploadingLogin(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Inställningar</h1>
                <p className="text-muted-foreground mt-2">Hantera applikationens utseende, logotyper och texter.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {message && (
                    <div className={`p-4 rounded-md text-sm border ${message.type === 'success' ? 'bg-green-500/15 text-green-600 border-green-500/20' : 'bg-destructive/15 text-destructive border-destructive/20'}`}>
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Admin Panel Settings */}
                    <Card className="glass-card shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-primary" />
                                Adminpanel
                            </CardTitle>
                            <CardDescription>Anpassa utseendet i menyn på insidan.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Sidtitel / Företagsnamn</label>
                                <Input
                                    value={settings.admin_title}
                                    onChange={(e) => setSettings({ ...settings, admin_title: e.target.value })}
                                    placeholder="T.ex. Medlemsregister"
                                />
                                <p className="text-xs text-muted-foreground">Visas högst upp i menyn till vänster.</p>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Ladda upp logotyp (Frivillig)</label>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'admin')}
                                        disabled={uploadingAdmin}
                                        className="cursor-pointer"
                                    />
                                    {uploadingAdmin && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                                </div>
                                <p className="text-xs text-muted-foreground">Bilden laddas upp automatiskt. Spara sidan för att tillämpa.</p>

                                {settings.admin_logo_url && (
                                    <div className="mt-2 p-4 bg-background/50 rounded-lg border flex flex-col items-center justify-center gap-4">
                                        <img
                                            src={settings.admin_logo_url}
                                            alt="Admin Logo Preview"
                                            style={{ height: `${settings.admin_logo_size}px` }}
                                            className="object-contain"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                        <div className="w-full space-y-2">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Storlek (höjd)</span>
                                                <span>{settings.admin_logo_size}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="16" max="100"
                                                value={settings.admin_logo_size}
                                                onChange={(e) => setSettings({ ...settings, admin_logo_size: parseInt(e.target.value) })}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Login Page Settings */}
                    <Card className="glass-card shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ImageIcon className="h-5 w-5 text-primary" />
                                Inloggningssidan
                            </CardTitle>
                            <CardDescription>Anpassa texter och bild på startsidan.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Huvudrubrik</label>
                                <Input
                                    value={settings.login_title}
                                    onChange={(e) => setSettings({ ...settings, login_title: e.target.value })}
                                    placeholder="T.ex. Välkommen"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Underrubrik</label>
                                <Input
                                    value={settings.login_subtitle}
                                    onChange={(e) => setSettings({ ...settings, login_subtitle: e.target.value })}
                                    placeholder="T.ex. Logga in på medlemsregistret"
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Ladda upp logotyp (Frivillig)</label>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'login')}
                                        disabled={uploadingLogin}
                                        className="cursor-pointer"
                                    />
                                    {uploadingLogin && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                                </div>
                                <p className="text-xs text-muted-foreground">Visas ovanför inloggningsformuläret.</p>

                                {settings.login_logo_url && (
                                    <div className="mt-2 p-4 bg-background/50 rounded-lg border flex flex-col items-center justify-center gap-4">
                                        <img
                                            src={settings.login_logo_url}
                                            alt="Login Logo Preview"
                                            style={{ height: `${settings.login_logo_size}px` }}
                                            className="object-contain"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                        <div className="w-full space-y-2">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Storlek (höjd)</span>
                                                <span>{settings.login_logo_size}px</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="32" max="200"
                                                value={settings.login_logo_size}
                                                onChange={(e) => setSettings({ ...settings, login_logo_size: parseInt(e.target.value) })}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-end">
                    <Button type="submit" disabled={saving} size="lg" className="w-full md:w-auto" variant="premium">
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sparar...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> Spara inställningar
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
