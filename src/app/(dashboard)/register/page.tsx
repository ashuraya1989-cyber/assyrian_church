"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Users,
    Search,
    Plus,
    Edit2,
    Trash2,
    ChevronRight,
    UserPlus,
    RefreshCcw,
    X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FamilyForm } from "@/components/family-form"

interface Family {
    id: string
    familje_namn: string
    make_namn: string
    hustru_namn: string
    mobil_nummer: string
    mail: string
    adress: string
    ort: string
    post_kod: string
    make_personnummer: string
    make_manads_avgift: number
    hustru_personnummer: string
    hustru_manads_avgift: number
    created_at: string
}

interface FullFamilyData extends Family {
    children: any[]
}

export default function RegisterPage() {
    const supabase = createClient()
    const [families, setFamilies] = useState<Family[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [showForm, setShowForm] = useState(false)

    // Modal & Action states
    const [selectedFamily, setSelectedFamily] = useState<FullFamilyData | null>(null)
    const [viewMode, setViewMode] = useState(false)
    const [deleteMode, setDeleteMode] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)

    const fetchFamilies = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('familjer')
            .select('*')
            .order('familje_namn', { ascending: true })

        if (error) {
            console.error('Error fetching families:', error)
        } else {
            setFamilies(data || [])
        }
        setLoading(false)
    }

    const fetchFamilyDetails = async (id: string) => {
        setActionLoading(true)
        const { data: familyObj, error: fError } = await supabase
            .from('familjer')
            .select('*')
            .eq('id', id)
            .single()

        const { data: childrenObj, error: cError } = await supabase
            .from('barn')
            .select('*')
            .eq('familj_id', id)
            .order('ordning', { ascending: true })

        setActionLoading(false)

        if (fError) {
            console.error('Error fetching family details:', fError)
            return null
        }

        return { ...familyObj, children: childrenObj || [] }
    }

    const handleView = async (id: string) => {
        const details = await fetchFamilyDetails(id)
        if (details) {
            setSelectedFamily(details)
            setViewMode(true)
        }
    }

    const handleEdit = async (id: string) => {
        const details = await fetchFamilyDetails(id)
        if (details) {
            setSelectedFamily(details)
            setEditMode(true)
        }
    }

    const handleDeleteClick = (family: Family) => {
        setSelectedFamily({ ...family, children: [] })
        setDeleteMode(true)
    }

    const confirmDelete = async () => {
        if (!selectedFamily) return
        setActionLoading(true)
        const { error } = await supabase
            .from('familjer')
            .delete()
            .eq('id', selectedFamily.id)

        setActionLoading(false)

        if (error) {
            console.error('Error deleting family:', error)
            alert("Kunde inte radera familjen.")
        } else {
            setDeleteMode(false)
            setSelectedFamily(null)
            fetchFamilies()
        }
    }

    useEffect(() => {
        fetchFamilies()
    }, [])

    const filteredFamilies = families.filter(f =>
        f.familje_namn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.make_namn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.hustru_namn && f.hustru_namn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        f.ort?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Familjeregister</h1>
                    <p className="text-muted-foreground">Hantera föreningens medlemmar och familjer.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={fetchFamilies} disabled={loading}>
                        <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    <Button variant="premium" onClick={() => setShowForm(true)}>
                        <UserPlus className="mr-2 h-4 w-4" /> Lägg till familj
                    </Button>
                </div>
            </div>

            {showForm && (
                <FamilyForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        setShowForm(false)
                        fetchFamilies()
                    }}
                />
            )}

            <Card className="glass-card border-none">
                <CardHeader className="p-4 md:p-6 pb-0 md:pb-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Sök på efternamn, namn eller ort..."
                            className="pl-10 bg-background/50 border-white/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0 pt-4 md:pt-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-y">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Familjenamn</th>
                                    <th className="px-6 py-3 font-semibold">Föräldrar</th>
                                    <th className="px-6 py-3 font-semibold">Mobil</th>
                                    <th className="px-6 py-3 font-semibold">Ort</th>
                                    <th className="px-6 py-3 font-semibold text-right">Åtgärder</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-32"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-48"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20"></div></td>
                                            <td className="px-6 py-4 text-right"><div className="h-8 bg-muted rounded w-8 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredFamilies.length > 0 ? (
                                    filteredFamilies.map((family) => (
                                        <tr key={family.id} className="hover:bg-accent/50 transition-colors group">
                                            <td className="px-6 py-4 font-medium">{family.familje_namn}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span>{family.make_namn}</span>
                                                    {family.hustru_namn && <span className="text-xs text-muted-foreground">{family.hustru_namn}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">{family.mobil_nummer || "-"}</td>
                                            <td className="px-6 py-4">{family.ort || "-"}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(family.id)}>
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(family)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(family.id)}>
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                            {searchQuery ? "Inga familjer matchar din sökning." : "Inga familjer registrerade än."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* EDIT MODAL */}
            {editMode && selectedFamily && (
                <FamilyForm
                    initialData={selectedFamily}
                    onClose={() => {
                        setEditMode(false)
                        setSelectedFamily(null)
                    }}
                    onSuccess={() => {
                        setEditMode(false)
                        setSelectedFamily(null)
                        fetchFamilies()
                    }}
                />
            )}

            {/* DELETE MODAL */}
            {deleteMode && selectedFamily && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md glass-card shadow-2xl">
                        <CardHeader>
                            <CardTitle>Bekräfta radering</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Är du säker på att du vill radera familjen <strong>{selectedFamily.familje_namn}</strong>? Detta kommer även att radera alla tillhörande barn och betalningar permanent.</p>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button variant="ghost" onClick={() => setDeleteMode(false)} disabled={actionLoading}>Avbryt</Button>
                                <Button variant="destructive" onClick={confirmDelete} disabled={actionLoading}>
                                    {actionLoading ? "Raderar..." : "Ja, radera"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW MODAL */}
            {viewMode && selectedFamily && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-card shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <CardTitle>Familjedetaljer: {selectedFamily.familje_namn}</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setViewMode(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="font-semibold text-muted-foreground">Mobil:</span> {selectedFamily.mobil_nummer || "-"}</div>
                                <div><span className="font-semibold text-muted-foreground">E-post:</span> {selectedFamily.mail || "-"}</div>
                                <div><span className="font-semibold text-muted-foreground">Adress:</span> {selectedFamily.adress || "-"}</div>
                                <div><span className="font-semibold text-muted-foreground">Ort:</span> {selectedFamily.ort || "-"} {selectedFamily.post_kod}</div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold border-b pb-2">Föräldrar</h3>
                                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                                    {selectedFamily.make_namn && (
                                        <div>
                                            <p className="font-medium text-primary">{selectedFamily.make_namn}</p>
                                            <p className="text-sm text-muted-foreground">PN: {selectedFamily.make_personnummer || "-"}</p>
                                            <p className="text-sm text-muted-foreground">Avgift: {selectedFamily.make_manads_avgift} kr</p>
                                        </div>
                                    )}
                                    {selectedFamily.hustru_namn && (
                                        <div>
                                            <p className="font-medium text-pink-600">{selectedFamily.hustru_namn}</p>
                                            <p className="text-sm text-muted-foreground">PN: {selectedFamily.hustru_personnummer || "-"}</p>
                                            <p className="text-sm text-muted-foreground">Avgift: {selectedFamily.hustru_manads_avgift} kr</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold border-b pb-2">Barn ({selectedFamily.children?.length || 0})</h3>
                                {selectedFamily.children && selectedFamily.children.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedFamily.children.map((child: any) => (
                                            <div key={child.id} className="bg-secondary/50 p-3 rounded-md text-sm">
                                                <p className="font-medium">{child.namn}</p>
                                                <p className="text-muted-foreground">PN: {child.personnummer || "-"}</p>
                                                <p className="text-muted-foreground">Avgift: {child.manads_avgift} kr</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Inga barn registrerade.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
