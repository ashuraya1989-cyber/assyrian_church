"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

const months = ["Januari", "Februari", "Mars", "April", "Maj", "Juni", "Juli", "Augusti", "September", "Oktober", "November", "December"]

export default function StatistikPage() {
    const supabase = createClient()
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            const { data: income } = await supabase.from('intakter').select('manad, total')
            const { data: expenses } = await supabase.from('utgifter').select('manad, total')

            const combined = months.map((m: string) => {
                const inc = income?.filter((i: any) => i.manad === m).reduce((sum: number, i: any) => sum + (i.total || 0), 0) || 0
                const exp = expenses?.filter((e: any) => e.manad === m).reduce((sum: number, e: any) => sum + (e.total || 0), 0) || 0
                return { month: m, income: inc, expense: exp }
            })

            setData(combined)
            setLoading(false)
        }
        fetchData()
    }, [])

    const maxVal = Math.max(...data.map((d: any) => Math.max(d.income, d.expense)), 1000)

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Statistik</h1>
                <p className="text-muted-foreground">Månatlig översikt av intäkter och utgifter.</p>
            </div>

            <Card className="glass-card border-none">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <BarChart3 className="mr-2 h-5 w-5 text-primary" /> Intäkter vs Utgifter
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-80 w-full flex items-end gap-2 md:gap-4 pt-10">
                        {data.map((d: any, i: number) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                <div className="flex gap-1 w-full justify-center h-full items-end">
                                    {/* Income bar */}
                                    <div
                                        className="w-2 md:w-4 bg-green-500 rounded-t-sm transition-all duration-500 hover:bg-green-600"
                                        style={{ height: `${(d.income / maxVal) * 100}%` }}
                                        title={`Intäkt: ${d.income} kr`}
                                    />
                                    {/* Expense bar */}
                                    <div
                                        className="w-2 md:w-4 bg-red-500 rounded-t-sm transition-all duration-500 hover:bg-red-600"
                                        style={{ height: `${(d.expense / maxVal) * 100}%` }}
                                        title={`Utgift: ${d.expense} kr`}
                                    />
                                </div>
                                <span className="text-[10px] md:text-xs text-muted-foreground rotate-45 md:rotate-0 mt-2">{d.month.substring(0, 3)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center gap-6 mt-12 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-500 rounded-sm" />
                            <span>Intäkter</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-sm" />
                            <span>Utgifter</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
