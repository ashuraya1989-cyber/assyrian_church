"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, Users, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Dashboard() {
    const supabase = createClient()
    const [stats, setStats] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        familyCount: 0,
        memberCount: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)

            const { data: income } = await supabase.from('intakter').select('total')
            const { data: expenses } = await supabase.from('utgifter').select('total')
            const { count: families } = await supabase.from('familjer').select('*', { count: 'exact', head: true })

            const totalInc = income?.reduce((sum, i) => sum + (i.total || 0), 0) || 0
            const totalExp = expenses?.reduce((sum, e) => sum + (e.total || 0), 0) || 0

            setStats({
                totalIncome: totalInc,
                totalExpenses: totalExp,
                familyCount: families || 0,
                memberCount: 0 // Would need another query for barn + adults
            })
            setLoading(false)
        }
        fetchStats()
    }, [])

    const remaining = stats.totalIncome - stats.totalExpenses

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Summering</h1>
                <p className="text-muted-foreground">Övergripande ekonomisk status för föreningen.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-card border-none overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Totala Intäkter</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{loading ? "..." : `${stats.totalIncome.toLocaleString('sv-SE')} kr`}</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> Från alla källor
                        </p>
                    </CardContent>
                    <div className="h-1 w-full bg-green-500/20 group-hover:bg-green-500/40 transition-colors" />
                </Card>

                <Card className="glass-card border-none overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Totala Utgifter</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">{loading ? "..." : `${stats.totalExpenses.toLocaleString('sv-SE')} kr`}</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center">
                            <ArrowDownRight className="h-3 w-3 mr-1" /> Hyra, räkningar etc.
                        </p>
                    </CardContent>
                    <div className="h-1 w-full bg-red-500/20 group-hover:bg-red-500/40 transition-colors" />
                </Card>

                <Card className="glass-card border-none overflow-hidden group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Resterande (Netto)</CardTitle>
                        <Wallet className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-3xl font-bold", remaining >= 0 ? "text-primary" : "text-destructive")}>
                            {loading ? "..." : `${remaining.toLocaleString('sv-SE')} kr`}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Saldot i kassan</p>
                    </CardContent>
                    <div className="h-1 w-full bg-primary/20 group-hover:bg-primary/40 transition-colors" />
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="glass-card border-none">
                    <CardHeader>
                        <CardTitle>Medlemskap</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                        <div className="p-4 rounded-full bg-primary/10">
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold">{stats.familyCount}</div>
                            <p className="text-sm text-muted-foreground">Registrerade familjer</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
