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

const navItems = [
    { name: "Summering", href: "/", icon: LayoutDashboard },
    { name: "Register", href: "/register", icon: Users },
    { name: "Betalningar", href: "/betalningar", icon: CreditCard },
    { name: "Utgifter", href: "/utgifter", icon: TrendingDown },
    { name: "Intäkter", href: "/intakter", icon: TrendingUp },
    { name: "Statistik", href: "/statistik", icon: BarChart3 },
]

export function Sidebar() {
    const supabase = createClient()
    const pathname = usePathname()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        window.location.href = "/login"
    }

    return (
        <div className="flex h-full flex-col bg-card border-r shadow-sm">
            <div className="p-6">
                <h2 className="text-xl font-bold tracking-tight premium-gradient bg-clip-text text-transparent">
                    Medlemsregister
                </h2>
            </div>
            <nav className="flex-1 space-y-1 px-3">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all",
                                isActive
                                    ? "bg-primary text-primary-foreground premium-gradient"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <Icon className={cn("mr-3 h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground")} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 border-t">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-all"
                >
                    <LogOut className="mr-3 h-5 w-5" />
                    Logga ut
                </button>
            </div>
        </div>
    )
}
