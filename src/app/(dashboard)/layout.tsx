import { Sidebar } from "@/components/sidebar"
import { LanguageProvider } from "@/components/language-provider"

export const dynamic = 'force-dynamic'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <LanguageProvider>
            <div className="flex h-screen bg-background">
                <aside className="w-64 flex-shrink-0 hidden md:block">
                    <Sidebar />
                </aside>
                <main className="flex-1 overflow-y-auto p-8 lg:p-12">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </LanguageProvider>
    )
}
