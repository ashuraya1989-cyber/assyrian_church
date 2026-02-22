"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    CreditCard,
    Search,
    CheckCircle2,
    AlertCircle,
    Clock,
    PlusCircle,
    RefreshCcw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, isAfter, isBefore, addDays, parseISO } from "date-fns"
import { sv } from "date-fns/locale"

interface PaymentInfo {
    id: string
    familje_namn: string
    total_manads_avgift: number
    total_ars_avgift: number
    summan: number
    betalat_till_datum: string
    betalat_via: string
    betalnings_referens: string
    familjer: {
        make_namn: string
        hustru_namn: string
    }
}

export default function BetalningarPage() {
    const supabase = createClient()
    const [payments, setPayments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    const fetchPayments = async () => {
        setLoading(true)
        // Fetch families and join with their latest payment
        const { data, error } = await supabase
            .from('familjer')
            .select(`
        id,
        familje_namn,
        make_namn,
        hustru_namn,
        betalningar (
          id,
          total_manads_avgift,
          total_ars_avgift,
          summan,
          betalat_till_datum,
          betalat_via,
          betalnings_referens,
          created_at
        ),
        barn (
          manads_avgift
        )
      `)
            .order('familje_namn', { ascending: true })

        if (error) {
            console.error('Error fetching payments:', error)
        } else {
            // Process data to get the latest payment and calculate total fees
            const processed = data?.map(f => {
                const latestPayment = f.betalningar?.sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0]

                // Calculate fees based on rules if no payment exists yet
                const adultCount = (f.make_namn ? 1 : 0) + (f.hustru_namn ? 1 : 0)
                const childFees = f.barn?.reduce((sum: number, b: any) => sum + (b.manads_avgift || 100), 0) || 0
                const calcMonthly = (adultCount * 200) + childFees

                return {
                    id: f.id,
                    familje_namn: f.familje_namn,
                    make_namn: f.make_namn,
                    hustru_namn: f.hustru_namn,
                    monthly_fee: latestPayment?.total_manads_avgift || calcMonthly,
                    annual_fee: latestPayment?.total_ars_avgift || (calcMonthly * 12),
                    paid_sum: latestPayment?.summan || 0,
                    paid_until: latestPayment?.betalat_till_datum,
                    method: latestPayment?.betalat_via,
                    ref: latestPayment?.betalnings_referens
                }
            })
            setPayments(processed || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchPayments()
    }, [])

    const getStatus = (paidUntil: string | null) => {
        if (!paidUntil) return { label: "Obetald", color: "text-destructive bg-destructive/10", icon: AlertCircle }

        const today = new Date()
        const untilDate = parseISO(paidUntil)
        const warningDate = addDays(today, 30)

        if (isBefore(untilDate, today)) {
            return { label: "Förfallen", color: "text-destructive bg-destructive/10", icon: AlertCircle }
        } else if (isBefore(untilDate, warningDate)) {
            return { label: "Snart förfaller", color: "text-amber-600 bg-amber-50", icon: Clock }
        } else {
            return { label: "À jour", color: "text-green-600 bg-green-50", icon: CheckCircle2 }
        }
    }

    const filteredPayments = payments.filter(p =>
        p.familje_namn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.make_namn.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Betalningar</h1>
                    <p className="text-muted-foreground">Följ upp medlemsavgifter och betalningsstatus.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={fetchPayments} disabled={loading}>
                        <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    <Button variant="premium">
                        <PlusCircle className="mr-2 h-4 w-4" /> Registrera betalning
                    </Button>
                </div>
            </div>

            <Card className="glass-card border-none">
                <CardHeader className="p-4 md:p-6 pb-0 md:pb-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Sök på familjenamn..."
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
                                    <th className="px-6 py-3 font-semibold">Familj</th>
                                    <th className="px-6 py-3 font-semibold">Månadsavgift</th>
                                    <th className="px-6 py-3 font-semibold">Årsavgift</th>
                                    <th className="px-6 py-3 font-semibold">Betalat till</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 font-semibold text-right">Åtgärder</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-32"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-20"></div></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-24"></div></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-muted rounded w-24"></div></td>
                                            <td className="px-6 py-4 text-right"><div className="h-8 bg-muted rounded w-8 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredPayments.length > 0 ? (
                                    filteredPayments.map((p) => {
                                        const status = getStatus(p.paid_until)
                                        const StatusIcon = status.icon
                                        return (
                                            <tr key={p.id} className="hover:bg-accent/50 transition-colors">
                                                <td className="px-6 py-4 font-medium">{p.familje_namn}</td>
                                                <td className="px-6 py-4">{p.monthly_fee} kr</td>
                                                <td className="px-6 py-4">{p.annual_fee} kr</td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {p.paid_until ? format(parseISO(p.paid_until), 'yyyy-MM-dd') : "-"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1", status.color)}>
                                                        <StatusIcon className="h-3 w-3" />
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm">Hantera</Button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                            Inga poster hittades.
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
