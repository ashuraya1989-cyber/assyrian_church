"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import {
    ArrowLeft,
    Users,
    Settings,
    Loader2,
    CheckCircle,
    XCircle,
    Save,
    BarChart3,
} from "lucide-react"
import { updateOrganisation, getOrgMembers, setActiveOrganisation } from "@/app/actions/org"

interface OrgMember {
    id: string
    user_id: string
    role: string
    permissions: string[]
    is_active: boolean
    created_at: string
    user_profiles: { email: string; role: string } | null
}

export default function OrgDetailPage() {
    const params = useParams()
    const orgId = params.orgId as string
    const supabase = useMemo(() => {
        try { return createClient() } catch { return null }
    }, [])

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [org, setOrg] = useState<any>(null)
    const [members, setMembers] = useState<OrgMember[]>([])
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [stats, setStats] = useState({ familjer: 0, betalningar: 0, intakter: 0, utgifter: 0 })

    // Editable fields
    const [name, setName] = useState("")
    const [slug, setSlug] = useState("")
    const [isActive, setIsActive] = useState(true)
    const [primaryColor, setPrimaryColor] = useState("#C9A84C")

    useEffect(() => {
        const init = async () => {
            if (!supabase) return

            // Fetch org details
            const { data: orgData } = await supabase
                .from('organisations')
                .select('*')
                .eq('id', orgId)
                .single()

            if (orgData) {
                setOrg(orgData)
                setName(orgData.name)
                setSlug(orgData.slug)
                setIsActive(orgData.is_active)
                setPrimaryColor(orgData.primary_color || '#C9A84C')
            }

            // Fetch members
            const membersData = await getOrgMembers(orgId)
            setMembers(membersData)

            // Fetch data stats (using service via RPC or direct count)
            try {
                const [f, b, i, u] = await Promise.all([
                    supabase.from('familjer').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
                    supabase.from('betalningar').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
                    supabase.from('intakter').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
                    supabase.from('utgifter').select('id', { count: 'exact', head: true }).eq('organisation_id', orgId),
                ])
                setStats({
                    familjer: f.count ?? 0,
                    betalningar: b.count ?? 0,
                    intakter: i.count ?? 0,
                    utgifter: u.count ?? 0,
                })
            } catch { /* ignore */ }

            setLoading(false)
        }
        init()
    }, [supabase, orgId])

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        try {
            const result = await updateOrganisation(orgId, {
                name,
                slug,
                is_active: isActive,
                primary_color: primaryColor,
            })
            if (!result.success) throw new Error(result.error)
            setMessage({ type: 'success', text: 'Organisation uppdaterad!' })
            setTimeout(() => setMessage(null), 3000)
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message })
        } finally {
            setSaving(false)
        }
    }

    const handleImpersonate = async () => {
        await setActiveOrganisation(orgId)
        window.location.href = "/"
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin" size={24} style={{ color: '#C9A84C' }} />
            </div>
        )
    }

    if (!org) {
        return (
            <div className="text-center py-20">
                <p className="text-sm" style={{ color: '#8A8178' }}>Organisation hittades inte.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Back + Title */}
            <div className="flex items-center gap-4">
                <a href="/super-admin"
                    className="p-2 rounded-lg transition-colors hover:bg-black/5">
                    <ArrowLeft size={20} style={{ color: '#6B6355' }} />
                </a>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{org.name}</h2>
                    <p className="text-sm" style={{ color: '#6B6355' }}>/{org.slug}</p>
                </div>
                <button
                    onClick={handleImpersonate}
                    className="px-4 py-2 rounded-[10px] text-sm font-semibold"
                    style={{ background: '#1A1A1A', color: '#C9A84C' }}
                >
                    Visa som denna org
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-[10px] text-sm border font-medium ${
                    message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                    {message.text}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Familjer', value: stats.familjer, icon: Users },
                    { label: 'Betalningar', value: stats.betalningar, icon: BarChart3 },
                    { label: 'Intakter', value: stats.intakter, icon: BarChart3 },
                    { label: 'Utgifter', value: stats.utgifter, icon: BarChart3 },
                ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-[12px] p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <s.icon size={14} style={{ color: '#C9A84C' }} />
                            <span className="text-xs font-medium" style={{ color: '#8A8178' }}>{s.label}</span>
                        </div>
                        <span className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{s.value}</span>
                    </div>
                ))}
            </div>

            {/* Edit org */}
            <div className="bg-card border border-border rounded-[14px] overflow-hidden shadow-sm">
                <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border font-semibold text-sm"
                    style={{ background: '#F7F3EC' }}>
                    <Settings size={16} style={{ color: '#C9A84C' }} />
                    <span>Organisationsinställningar</span>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Namn</label>
                        <input className="input-premium" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Slug</label>
                        <input className="input-premium" value={slug} onChange={(e) => setSlug(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Primärfärg</label>
                        <div className="flex gap-2">
                            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)}
                                className="w-10 h-10 rounded-lg cursor-pointer border border-border" />
                            <input className="input-premium flex-1" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold">Status</label>
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsActive(!isActive)}
                                className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${isActive ? 'left-[22px]' : 'left-0.5'}`} />
                            </button>
                            <span className="text-sm" style={{ color: isActive ? '#22C55E' : '#EF4444' }}>
                                {isActive ? 'Aktiv' : 'Inaktiv'}
                            </span>
                        </div>
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold disabled:opacity-60"
                            style={{ background: '#1A1A1A', color: '#FEFCF8' }}
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Spara
                        </button>
                    </div>
                </div>
            </div>

            {/* Members */}
            <div className="bg-card border border-border rounded-[14px] overflow-hidden shadow-sm">
                <div className="flex items-center gap-2.5 px-6 py-4 border-b border-border font-semibold text-sm"
                    style={{ background: '#F7F3EC' }}>
                    <Users size={16} style={{ color: '#C9A84C' }} />
                    <span>Medlemmar ({members.length})</span>
                </div>
                <div className="divide-y divide-border">
                    {members.map((m) => (
                        <div key={m.id} className="flex items-center gap-4 px-6 py-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: '#1A1A1A' }}>
                                    {m.user_profiles?.email ?? m.user_id}
                                </p>
                                <p className="text-xs" style={{ color: '#8A8178' }}>
                                    {m.role} · {new Date(m.created_at).toLocaleDateString('sv-SE')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {m.is_active ? (
                                    <CheckCircle size={14} style={{ color: '#22C55E' }} />
                                ) : (
                                    <XCircle size={14} style={{ color: '#EF4444' }} />
                                )}
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{
                                        background: m.role === 'admin' || m.role === 'superadmin' ? '#FEF3C7' : '#F3F4F6',
                                        color: m.role === 'admin' || m.role === 'superadmin' ? '#92400E' : '#6B7280',
                                    }}>
                                    {m.role}
                                </span>
                            </div>
                        </div>
                    ))}
                    {members.length === 0 && (
                        <div className="px-6 py-8 text-center text-sm" style={{ color: '#8A8178' }}>
                            Inga medlemmar i denna organisation.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
