"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/utils/supabase/client"
import {
    Building2,
    Plus,
    Users,
    Loader2,
    CheckCircle,
    XCircle,
    Eye,
    ArrowRight,
} from "lucide-react"
import { createOrganisation, setActiveOrganisation } from "@/app/actions/org"

interface Organisation {
    id: string
    name: string
    slug: string
    logo_url: string | null
    primary_color: string
    is_active: boolean
    created_at: string
    organisation_members: { count: number }[]
}

export default function SuperAdminPage() {
    const supabase = useMemo(() => {
        try { return createClient() } catch { return null }
    }, [])

    const [orgs, setOrgs] = useState<Organisation[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Form state
    const [newName, setNewName] = useState("")
    const [newSlug, setNewSlug] = useState("")
    const [newColor, setNewColor] = useState("#C9A84C")

    const fetchOrgs = async () => {
        if (!supabase) return
        try {
            const { data } = await supabase
                .from('organisations')
                .select('*, organisation_members(count)')
                .order('created_at', { ascending: false })
            setOrgs(data ?? [])
        } catch { /* ignore */ }
        setLoading(false)
    }

    useEffect(() => { fetchOrgs() }, [supabase])

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        setError(null)
        try {
            const formData = new FormData()
            formData.set('name', newName)
            formData.set('slug', newSlug || newName.toLowerCase().replace(/[^a-z0-9]/g, '-'))
            formData.set('primary_color', newColor)
            const result = await createOrganisation(formData)
            if (!result.success) throw new Error(result.error)
            setSuccess(`Organisation "${newName}" skapad!`)
            setShowCreate(false)
            setNewName("")
            setNewSlug("")
            setNewColor("#C9A84C")
            await fetchOrgs()
            setTimeout(() => setSuccess(null), 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setCreating(false)
        }
    }

    const handleImpersonate = async (orgId: string) => {
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
                        Organisationer
                    </h2>
                    <p className="text-sm mt-1" style={{ color: '#6B6355' }}>
                        Hantera alla organisationer i systemet
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-sm font-semibold transition-all"
                    style={{ background: '#1A1A1A', color: '#FEFCF8' }}
                >
                    <Plus size={16} />
                    Skapa organisation
                </button>
            </div>

            {/* Messages */}
            {error && (
                <div className="p-4 rounded-[10px] border text-sm bg-red-50 text-red-700 border-red-200">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 rounded-[10px] border text-sm bg-green-50 text-green-700 border-green-200">
                    {success}
                </div>
            )}

            {/* Create form */}
            {showCreate && (
                <div className="bg-card border border-border rounded-[14px] p-6 shadow-sm">
                    <h3 className="font-semibold mb-4">Ny organisation</h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Namn</label>
                            <input
                                className="input-premium"
                                value={newName}
                                onChange={(e) => {
                                    setNewName(e.target.value)
                                    if (!newSlug) setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9åäö]/g, '-').replace(/-+/g, '-'))
                                }}
                                placeholder="Stockholm Kyrkan"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Slug (URL)</label>
                            <input
                                className="input-premium"
                                value={newSlug}
                                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                placeholder="stockholm-kyrkan"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold">Primärfärg</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={newColor}
                                    onChange={(e) => setNewColor(e.target.value)}
                                    className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                                />
                                <input
                                    className="input-premium flex-1"
                                    value={newColor}
                                    onChange={(e) => setNewColor(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="md:col-span-3 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="px-4 py-2 rounded-[10px] text-sm font-medium"
                                style={{ color: '#6B6355' }}
                            >
                                Avbryt
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-semibold disabled:opacity-60"
                                style={{ background: '#1A1A1A', color: '#FEFCF8' }}
                            >
                                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                Skapa
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Org list */}
            <div className="grid gap-4">
                {orgs.map((org) => (
                    <div
                        key={org.id}
                        className="bg-card border border-border rounded-[14px] p-5 shadow-sm flex items-center gap-4"
                    >
                        {/* Logo / initials */}
                        {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="w-12 h-12 rounded-xl object-contain" />
                        ) : (
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                                style={{ background: org.primary_color || '#C9A84C' }}>
                                {org.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold truncate" style={{ color: '#1A1A1A' }}>{org.name}</h3>
                                {org.is_active ? (
                                    <CheckCircle size={14} className="flex-shrink-0" style={{ color: '#22C55E' }} />
                                ) : (
                                    <XCircle size={14} className="flex-shrink-0" style={{ color: '#EF4444' }} />
                                )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs" style={{ color: '#8A8178' }}>
                                <span>/{org.slug}</span>
                                <span className="flex items-center gap-1">
                                    <Users size={11} />
                                    {org.organisation_members?.[0]?.count ?? 0} användare
                                </span>
                                <span>
                                    {new Date(org.created_at).toLocaleDateString('sv-SE')}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleImpersonate(org.id)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium transition-colors"
                                style={{ background: '#F7F3EC', color: '#1A1A1A' }}
                                title="Visa som denna organisation"
                            >
                                <Eye size={13} />
                                Visa
                            </button>
                            <a
                                href={`/super-admin/${org.id}`}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-medium transition-colors"
                                style={{ background: '#1A1A1A', color: '#C9A84C' }}
                            >
                                Hantera
                                <ArrowRight size={13} />
                            </a>
                        </div>
                    </div>
                ))}

                {orgs.length === 0 && (
                    <div className="text-center py-16">
                        <Building2 size={48} className="mx-auto mb-4" style={{ color: '#DDD8CE' }} />
                        <p className="text-sm" style={{ color: '#8A8178' }}>
                            Inga organisationer skapade ännu. Klicka "Skapa organisation" för att börja.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
