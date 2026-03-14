import { Sidebar, MobileSidebar } from "@/components/sidebar"
import { LanguageProvider } from "@/components/language-provider"

export const dynamic = 'force-dynamic'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <LanguageProvider>
            <div className="flex h-screen bg-background overflow-hidden">
                {/* Desktop sidebar */}
                <aside className="w-64 flex-shrink-0 hidden md:block">
                    <Sidebar />
                </aside>

                {/* Mobile sidebar */}
                <MobileSidebar />

                {/* Main content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="px-6 py-7 md:px-10 md:py-8 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </LanguageProvider>
    )
}
