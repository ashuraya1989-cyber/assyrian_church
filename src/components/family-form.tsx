"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Plus, Trash2 } from "lucide-react"

interface FamilyFormProps {
    onClose: () => void
    onSuccess: () => void
    initialData?: any
}

export function FamilyForm({ onClose, onSuccess, initialData }: FamilyFormProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [validationErrors, setValidationErrors] = useState<string[]>([])

    const [familyData, setFamilyData] = useState({
        id: initialData?.id || undefined,
        familje_namn: "",
        make_namn: "",
        make_personnummer: "",
        make_manads_avgift: 200,
        hustru_namn: "",
        hustru_personnummer: "",
        hustru_manads_avgift: 200,
        mobil_nummer: "",
        mail: "",
        adress: "",
        ort: "",
        post_kod: initialData?.post_kod || "",
        land: initialData?.land || "Sverige",
    })

    const [children, setChildren] = useState<any[]>(initialData?.children || [])

    const addChild = () => {
        if (children.length >= 6) return
        setChildren([...children, { ordning: children.length + 1, namn: "", personnummer: "", manads_avgift: 100 }])
    }

    const removeChild = (index: number) => {
        const newChildren = children.filter((_: any, i: number) => i !== index)
        // Re-order
        const reordered = newChildren.map((c: any, i: number) => ({ ...c, ordning: i + 1 }))
        setChildren(reordered)
    }

    const updateChild = (index: number, field: string, value: any) => {
        const newChildren = [...children]
        newChildren[index] = { ...newChildren[index], [field]: value }
        setChildren(newChildren)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setValidationErrors([])

        const errors: string[] = []

        if (!familyData.familje_namn?.trim()) errors.push('familje_namn')
        if (!familyData.mobil_nummer?.trim()) errors.push('mobil_nummer')
        if (!familyData.mail?.trim()) errors.push('mail')
        if (!familyData.adress?.trim()) errors.push('adress')
        if (!familyData.ort?.trim()) errors.push('ort')
        if (!familyData.post_kod?.trim()) errors.push('post_kod')
        if (!familyData.make_namn?.trim()) errors.push('make_namn')
        if (!familyData.make_personnummer || familyData.make_personnummer.trim().length !== 12) errors.push('make_personnummer')
        if (familyData.make_manads_avgift === undefined || familyData.make_manads_avgift === null || isNaN(familyData.make_manads_avgift)) errors.push('make_manads_avgift')

        if (errors.length > 0) {
            setValidationErrors(errors)
            setError("Vänligen fyll i alla obligatoriska fält korrekt (markerade i rött). Personnummer måste vara 12 siffror.")
            setLoading(false)
            return
        }

        try {
            if (familyData.id) {
                // Edit Mode
                const { error: rpcError } = await supabase.rpc('update_family_with_children', {
                    p_family_id: familyData.id,
                    family_data: familyData,
                    children_data: children
                })
                if (rpcError) throw rpcError
            } else {
                // Create Mode
                const { error: rpcError } = await supabase.rpc('add_family_with_children', {
                    family_data: familyData,
                    children_data: children
                })
                if (rpcError) throw rpcError
            }

            onSuccess()
        } catch (err: any) {
            setError(err.message || "Ett fel uppstod vid sparande")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-card shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <CardTitle>{initialData ? "Redigera familj" : "Lägg till ny familj"}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6 pt-6">
                        {error && (
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Family & Contact */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">Huvudinformation</h3>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Familje efternamn</label>
                                    <Input
                                        className={validationErrors.includes('familje_namn') ? "border-red-500 focus-visible:ring-red-500" : ""}
                                        value={familyData.familje_namn}
                                        onChange={(e) => setFamilyData({ ...familyData, familje_namn: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium">Mobil</label>
                                        <Input
                                            className={validationErrors.includes('mobil_nummer') ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            value={familyData.mobil_nummer}
                                            onChange={(e) => setFamilyData({ ...familyData, mobil_nummer: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium">E-post</label>
                                        <Input
                                            className={validationErrors.includes('mail') ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            type="email"
                                            value={familyData.mail}
                                            onChange={(e) => setFamilyData({ ...familyData, mail: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Adress</label>
                                    <Input
                                        className={validationErrors.includes('adress') ? "border-red-500 focus-visible:ring-red-500" : ""}
                                        value={familyData.adress}
                                        onChange={(e) => setFamilyData({ ...familyData, adress: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium">Ort</label>
                                        <Input
                                            className={validationErrors.includes('ort') ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            value={familyData.ort}
                                            onChange={(e) => setFamilyData({ ...familyData, ort: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium">Postnummer</label>
                                        <Input
                                            className={validationErrors.includes('post_kod') ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            value={familyData.post_kod}
                                            onChange={(e) => setFamilyData({ ...familyData, post_kod: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Land</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={familyData.land}
                                        onChange={(e) => setFamilyData({ ...familyData, land: e.target.value })}
                                    >
                                        <option value="Sverige">Sverige</option>
                                        <option value="Danmark">Danmark</option>
                                        <option value="Norge">Norge</option>
                                        <option value="Finland">Finland</option>
                                        <option value="Tyskland">Tyskland</option>
                                        <option value="USA">USA</option>
                                        <option value="Storbritannien">Storbritannien</option>
                                        <option value="Annat">Annat</option>
                                    </select>
                                </div>
                            </div>

                            {/* Parents */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold border-b pb-2">Vuxna</h3>
                                <div className="p-4 rounded-lg bg-muted/30 border space-y-4">
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium text-primary">Make (Namn)</label>
                                        <Input
                                            className={validationErrors.includes('make_namn') ? "border-red-500 focus-visible:ring-red-500" : ""}
                                            value={familyData.make_namn}
                                            onChange={(e) => setFamilyData({ ...familyData, make_namn: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Personnummer (12 siffror)</label>
                                            <Input
                                                className={validationErrors.includes('make_personnummer') ? "border-red-500 focus-visible:ring-red-500" : ""}
                                                type="text"
                                                maxLength={12}
                                                placeholder="ÅÅÅÅMMDDNNNN"
                                                value={familyData.make_personnummer}
                                                onChange={(e) => setFamilyData({ ...familyData, make_personnummer: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Avgift (SEK)</label>
                                            <Input
                                                className={validationErrors.includes('make_manads_avgift') ? "border-red-500 focus-visible:ring-red-500" : ""}
                                                type="number"
                                                value={familyData.make_manads_avgift}
                                                onChange={(e) => setFamilyData({ ...familyData, make_manads_avgift: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-lg bg-muted/30 border space-y-4">
                                    <div className="grid gap-2">
                                        <label className="text-sm font-medium text-pink-600">Hustru (Namn)</label>
                                        <Input
                                            value={familyData.hustru_namn}
                                            onChange={(e) => setFamilyData({ ...familyData, hustru_namn: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Personnummer (12 siffror)</label>
                                            <Input
                                                type="text"
                                                maxLength={12}
                                                placeholder="ÅÅÅÅMMDDNNNN"
                                                value={familyData.hustru_personnummer}
                                                onChange={(e) => setFamilyData({ ...familyData, hustru_personnummer: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <label className="text-sm font-medium">Avgift (SEK)</label>
                                            <Input
                                                type="number"
                                                value={familyData.hustru_manads_avgift}
                                                onChange={(e) => setFamilyData({ ...familyData, hustru_manads_avgift: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Children */}
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-lg font-semibold">Barn (Max 6)</h3>
                                <Button type="button" variant="outline" size="sm" onClick={addChild} disabled={children.length >= 6}>
                                    <Plus className="h-4 w-4 mr-1" /> Lägg till barn
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {children.map((child, index) => (
                                    <div key={index} className="p-4 rounded-lg bg-secondary/50 border relative group">
                                        <button
                                            type="button"
                                            onClick={() => removeChild(index)}
                                            className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <div className="space-y-3">
                                            <div className="grid gap-1">
                                                <label className="text-xs font-semibold uppercase text-muted-foreground">Namn (Barn {index + 1})</label>
                                                <Input
                                                    placeholder="Barnets namn"
                                                    value={child.namn}
                                                    onChange={(e) => updateChild(index, 'namn', e.target.value)}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="grid gap-1">
                                                    <label className="text-xs font-semibold uppercase text-muted-foreground">Personnummer (12 siffror)</label>
                                                    <Input
                                                        type="text"
                                                        maxLength={12}
                                                        placeholder="ÅÅÅÅMMDDNNNN"
                                                        value={child.personnummer}
                                                        onChange={(e) => updateChild(index, 'personnummer', e.target.value)}
                                                    />
                                                </div>
                                                <div className="grid gap-1">
                                                    <label className="text-xs font-semibold uppercase text-muted-foreground">Avgift (SEK)</label>
                                                    <Input
                                                        type="number"
                                                        value={child.manads_avgift}
                                                        onChange={(e) => updateChild(index, 'manads_avgift', parseInt(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {children.length === 0 && (
                                    <div className="col-span-full py-8 text-center border-2 border-dashed rounded-lg text-muted-foreground">
                                        Inga barn tillagda än. Klicka på "Lägg till barn" för att registrera barn.
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-card/80 backdrop-blur-md">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Avbryt</Button>
                        <Button type="submit" variant="premium" disabled={loading}>
                            {loading ? "Sparar..." : (initialData ? "Uppdatera familj" : "Spara familj")}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
