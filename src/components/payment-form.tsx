"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from "lucide-react"

interface PaymentFormProps {
    onClose: () => void
    onSuccess: () => void
    initialData?: any
    selectedFamilyId?: string | null
}

export function PaymentForm({ onClose, onSuccess, initialData, selectedFamilyId }: PaymentFormProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [families, setFamilies] = useState<any[]>([])

    const [formData, setFormData] = useState({
        id: initialData?.id || undefined,
        familj_id: initialData?.familj_id || selectedFamilyId || "",
        total_manads_avgift: initialData?.total_manads_avgift || 0,
        total_ars_avgift: initialData?.total_ars_avgift || 0,
        summan: initialData?.summan || 0,
        betalat_till_datum: initialData?.betalat_till_datum || new Date().toISOString().split('T')[0],
        betalat_via: initialData?.betalat_via || "Swish",
        betalnings_referens: initialData?.betalnings_referens || "",
    })

    useEffect(() => {
        const fetchFamilies = async () => {
            const { data } = await supabase.from('familjer').select('id, familje_namn, make_namn, hustru_namn').order('familje_namn')
            if (data) setFamilies(data)
        }
        fetchFamilies()
    }, [])

    const calculateFees = async (familjId: string) => {
        if (!familjId) return
        try {
            const { data: family } = await supabase.from('familjer').select('*').eq('id', familjId).single()
            const { data: children } = await supabase.from('barn').select('*').eq('familj_id', familjId)

            if (family) {
                const adultCount = (family.make_namn ? 1 : 0) + (family.hustru_namn ? 1 : 0)
                const childFees = children?.reduce((sum: number, b: any) => sum + (b.manads_avgift || 100), 0) || 0
                const calcMonthly = (adultCount * 200) + childFees

                setFormData(prev => ({
                    ...prev,
                    familj_id: familjId,
                    total_manads_avgift: calcMonthly,
                    total_ars_avgift: calcMonthly * 12,
                    summan: calcMonthly
                }))
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value
        setFormData({ ...formData, familj_id: id })
        if (id && !initialData) {
            calculateFees(id)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.familj_id) {
            setError("Vänligen välj en familj.")
            return
        }

        setLoading(true)
        setError(null)

        try {
            if (formData.id) {
                // Update
                const { error: updateError } = await supabase
                    .from('betalningar')
                    .update({
                        familj_id: formData.familj_id,
                        total_manads_avgift: formData.total_manads_avgift,
                        total_ars_avgift: formData.total_ars_avgift,
                        summan: formData.summan,
                        betalat_till_datum: formData.betalat_till_datum,
                        betalat_via: formData.betalat_via,
                        betalnings_referens: formData.betalnings_referens,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', formData.id)
                if (updateError) throw updateError
            } else {
                // Insert
                const { error: insertError } = await supabase
                    .from('betalningar')
                    .insert([{
                        familj_id: formData.familj_id,
                        total_manads_avgift: formData.total_manads_avgift,
                        total_ars_avgift: formData.total_ars_avgift,
                        summan: formData.summan,
                        betalat_till_datum: formData.betalat_till_datum,
                        betalat_via: formData.betalat_via,
                        betalnings_referens: formData.betalnings_referens
                    }])
                if (insertError) throw insertError
            }
            onSuccess()
        } catch (err: any) {
            setError(err.message || "Ett fel uppstod.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg glass-card shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <CardTitle>{initialData ? "Redigera betalning" : "Registrera ny betalning"}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4 pt-6">
                        {error && (
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Familj</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                                value={formData.familj_id}
                                onChange={handleFamilyChange}
                                disabled={!!initialData || !!selectedFamilyId}
                                required
                            >
                                <option value="">-- Välj familj --</option>
                                {families.map(f => (
                                    <option key={f.id} value={f.id}>
                                        {f.familje_namn} ({f.make_namn || f.hustru_namn})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-muted-foreground">Estimerad Månadsavgift</label>
                                <Input
                                    type="number"
                                    value={formData.total_manads_avgift}
                                    onChange={(e) => setFormData({ ...formData, total_manads_avgift: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium text-muted-foreground">Estimerad Årsavgift</label>
                                <Input
                                    type="number"
                                    value={formData.total_ars_avgift}
                                    onChange={(e) => setFormData({ ...formData, total_ars_avgift: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Betalad summa (kr)</label>
                                <Input
                                    type="number"
                                    required
                                    value={formData.summan}
                                    onChange={(e) => setFormData({ ...formData, summan: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Betalat via</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.betalat_via}
                                    onChange={(e) => setFormData({ ...formData, betalat_via: e.target.value })}
                                    required
                                >
                                    <option value="Swish">Swish</option>
                                    <option value="Bank Överföring">Bank Överföring</option>
                                    <option value="Kontant">Kontant</option>
                                    <option value="Annat">Annat</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Giltig till datum</label>
                            <Input
                                type="date"
                                required
                                value={formData.betalat_till_datum}
                                onChange={(e) => setFormData({ ...formData, betalat_till_datum: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">Medlemskapet är giltigt fram till detta datum.</p>
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Betalningsreferens (Frivillig)</label>
                            <Input
                                value={formData.betalnings_referens}
                                onChange={(e) => setFormData({ ...formData, betalnings_referens: e.target.value })}
                                placeholder="T.ex. Swish-nummer eller kvitto-ID"
                            />
                        </div>

                    </CardContent>
                    <div className="p-6 border-t flex justify-end gap-3 bg-card/80">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Avbryt</Button>
                        <Button type="submit" variant="premium" disabled={loading}>
                            {loading ? "Sparar..." : "Spara betalning"}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
