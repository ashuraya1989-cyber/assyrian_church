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
    RefreshCcw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { FamilyForm } from "@/components/family-form"

interface Family {
    id: string
    familje_namn: string
    make_namn: string
    hustru_namn: string
    mobil_nummer: string
    ort: string
    created_at: string
}

export default function RegisterPage() {
    const supabase = createClient()
    const [families, setFamilies] = useState<Family[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [showForm, setShowForm] = useState(false)

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
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Edit2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
        </div>
    )
}
