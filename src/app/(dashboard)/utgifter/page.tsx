"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingDown, Plus, Search, Calendar, RefreshCcw } from "lucide-react"
import { cn } from "@/lib/utils"

const months = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"]

export default function UtgifterPage() {
    const supabase = createClient()
    const [items, setItems] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState("Alla")
    const [showForm, setShowForm] = useState(false)

    const fetchItems = async () => {
        setLoading(true)
        let query = supabase.from('utgifter').select('*').order('datum', { ascending: false })
        if (selectedMonth !== "Alla") {
            query = query.eq('manad', selectedMonth)
        }
        const { data, error } = await query
        if (error) console.error(error)
        else setItems(data || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchItems()
    }, [selectedMonth])

    // Monthly summary calculation
    const monthlySummary = items.reduce((acc: any, item: any) => {
        const month = item.manad
        if (!acc[month]) acc[month] = { hyra: 0, frukost: 0, rakning: 0, annat: 0, total: 0 }
        acc[month].hyra += item.hyra || 0
        acc[month].frukost += item.frukost || 0
        acc[month].rakning += item.rakning || 0
        acc[month].annat += item.annat || 0
        acc[month].total += item.total || 0
        return acc
    }, {})

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Utgifter</h1>
                    <p className="text-muted-foreground">Registrera och följ upp föreningens utgifter.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={fetchItems} disabled={loading}>
                        <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    <Button variant="premium" onClick={() => setShowForm(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Ny utgiftstpost
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main List */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="glass-card border-none">
                        <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between border-b">
                            <CardTitle className="text-lg">Veckovisa utgifter</CardTitle>
                            <select
                                className="bg-background border rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            >
                                <option value="Alla">Alla månader</option>
                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                                        <tr>
                                            <th className="px-6 py-3">Datum/Månad</th>
                                            <th className="px-6 py-3">Vecka</th>
                                            <th className="px-6 py-3">Total</th>
                                            <th className="px-6 py-3">Kategori (Hyra/Fru/Räk/And)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {loading ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={4} className="px-6 py-4"><div className="h-4 bg-muted rounded w-full"></div></td>
                                                </tr>
                                            ))
                                        ) : items.length > 0 ? (
                                            items.map((item) => (
                                                <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className="font-medium">{item.datum}</span>
                                                        <span className="text-xs ml-2 text-muted-foreground">{item.manad}</span>
                                                    </td>
                                                    <td className="px-6 py-4">V.{item.vecka}</td>
                                                    <td className="px-6 py-4 font-bold text-red-600">-{item.total} kr</td>
                                                    <td className="px-6 py-4 text-xs text-muted-foreground">
                                                        {item.hyra}/{item.frukost}/{item.rakning}/{item.annat}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">Inga utgifter registrerade.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-6">
                    <Card className="glass-card border-none overflow-hidden">
                        <CardHeader className="bg-red-500 text-white">
                            <CardTitle className="text-lg flex items-center">
                                <TrendingDown className="mr-2 h-5 w-5" /> Månadssammanfattning
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {Object.entries(monthlySummary).length > 0 ? (
                                    Object.entries(monthlySummary).map(([month, data]: [string, any]) => (
                                        <div key={month} className="p-4 space-y-3">
                                            <h4 className="font-bold text-primary">{month}</h4>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span>Hyra</span>
                                                    <span className="font-medium">{data.hyra} kr</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Frukost</span>
                                                    <span className="font-medium">{data.frukost} kr</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Räkningar</span>
                                                    <span className="font-medium">{data.rakning} kr</span>
                                                </div>
                                                <div className="flex justify-between border-t pt-1 mt-1 text-base font-bold text-red-600">
                                                    <span>Totalt</span>
                                                    <span>{data.total} kr</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center text-muted-foreground">Välj en månad för att se sammanfattning.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {showForm && (
                <ExpenseForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => {
                        setShowForm(false)
                        fetchItems()
                    }}
                />
            )}
        </div>
    )
}

function ExpenseForm({ onClose, onSuccess }: any) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState({
        manad: months[new Date().getMonth()],
        vecka: 1,
        hyra: 0,
        frukost: 0,
        rakning: 0,
        annat: 0,
        kommentar: "",
        rapporterat_av: "",
        datum: new Date().toISOString().split('T')[0]
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const total = Number(data.hyra) + Number(data.frukost) + Number(data.rakning) + Number(data.annat)
        const { error } = await supabase.from('utgifter').insert([{ ...data, total }])
        if (error) alert(error.message)
        else onSuccess()
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg glass-card text-card-foreground">
                <CardHeader>
                    <CardTitle>Ny utgift</CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Månad</label>
                            <select
                                className="bg-background border rounded-md px-3 py-2 text-sm"
                                value={data.manad}
                                onChange={(e) => setData({ ...data, manad: e.target.value })}
                            >
                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Vecka</label>
                            <Input type="number" value={data.vecka} onChange={(e) => setData({ ...data, vecka: parseInt(e.target.value) })} />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Hyra</label>
                            <Input type="number" value={data.hyra} onChange={(e) => setData({ ...data, hyra: parseInt(e.target.value) })} />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Frukost</label>
                            <Input type="number" value={data.frukost} onChange={(e) => setData({ ...data, frukost: parseInt(e.target.value) })} />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Räkningar</label>
                            <Input type="number" value={data.rakning} onChange={(e) => setData({ ...data, rakning: parseInt(e.target.value) })} />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Annat</label>
                            <Input type="number" value={data.annat} onChange={(e) => setData({ ...data, annat: parseInt(e.target.value) })} />
                        </div>
                        <div className="grid gap-2 col-span-2">
                            <label className="text-sm font-medium">Rapporterat av</label>
                            <Input value={data.rapporterat_av} onChange={(e) => setData({ ...data, rapporterat_av: e.target.value })} />
                        </div>
                        <div className="grid gap-2 col-span-2">
                            <label className="text-sm font-medium">Datum</label>
                            <Input type="date" value={data.datum} onChange={(e) => setData({ ...data, datum: e.target.value })} />
                        </div>
                    </CardContent>
                    <div className="p-6 border-t flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={onClose}>Avbryt</Button>
                        <Button type="submit" variant="premium" disabled={loading}>Spara</Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
