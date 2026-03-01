"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    Users,
    CreditCard,
    TrendingDown,
    TrendingUp,
    BarChart3,
    LogOut,
    LayoutDashboard
} from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { useLanguage } from "@/components/language-provider"

const navItems = [
    { key: "nav.dashboard", href: "/", icon: LayoutDashboard },
    { key: "nav.register", href: "/register", icon: Users },
    { key: "nav.payments", href: "/betalningar", icon: CreditCard },
    { key: "nav.expenses", href: "/utgifter", icon: TrendingDown },
    { key: "nav.income", href: "/intakter", icon: TrendingUp },
    { key: "nav.stats", href: "/statistik", icon: BarChart3 },
]

export function Sidebar() {
    const supabase = createClient()
    const pathname = usePathname()
    const { language, setLanguage, t } = useLanguage()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = "/login"
    }

    return (
        <div className="flex h-full flex-col bg-card border-r shadow-sm">
            <div className="p-6">
                <h2 className="text-xl font-bold tracking-tight premium-gradient bg-clip-text text-transparent">
                    {t('app.title')}
                </h2>
            </div>
            <nav className="flex-1 space-y-1 px-3">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={cn(
                                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all",
                                isActive
                                    ? "bg-primary text-primary-foreground premium-gradient"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground")} />
                            {t(item.key)}
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 border-t space-y-4">
                <div className="flex items-center justify-between px-3">
                    <span className="text-sm font-medium text-muted-foreground">Språk / Language</span>
                    <select
                        className="bg-transparent text-sm border border-border rounded px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'sv' | 'en')}
                    >
                        <option value="sv">Svenska</option>
                        <option value="en">English</option>
                    </select>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-all"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    {t('nav.logout')}
                </button>
            </div>
        </div>
    )
}
