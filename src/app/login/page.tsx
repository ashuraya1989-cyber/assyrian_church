"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn } from "lucide-react"

export default function LoginPage() {
    // Lazy initialize to avoid build-time issues
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loginTitle, setLoginTitle] = useState<string>("Välkommen")
    const [loginSubtitle, setLoginSubtitle] = useState<string>("Logga in på medlemsregistret")
    const [loginLogoUrl, setLoginLogoUrl] = useState<string | null>(null)
    const [loginLogoSize, setLoginLogoSize] = useState<number>(64)

    useEffect(() => {
        const fetchSettings = async () => {
            const supabase = createClient()
            const { data } = await supabase.from('app_settings').select('login_title, login_subtitle, login_logo_url, login_logo_size').eq('id', 1).single()
            if (data) {
                if (data.login_title) setLoginTitle(data.login_title)
                if (data.login_subtitle) setLoginSubtitle(data.login_subtitle)
                if (data.login_logo_url) setLoginLogoUrl(data.login_logo_url)
                if (data.login_logo_size) setLoginLogoSize(data.login_logo_size)
            }
        }
        fetchSettings()
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const supabase = createClient()
        if (!supabase.auth) {
            setError("Inställningar för Supabase saknas. Kontrollera dina miljövariabler.")
            setLoading(false)
            return
        }

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            // Redirect handled by middleware or manually
            window.location.href = "/register"
        } catch (err: any) {
            setError(err.message || "Ett fel uppstod vid inloggning")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background premium-gradient p-4">
            <Card className="w-full max-w-md glass-card border-none">
                <CardHeader className="space-y-1 text-center flex flex-col items-center">
                    {loginLogoUrl && (
                        <div className="mb-4">
                            <img
                                src={loginLogoUrl}
                                alt="Logo"
                                style={{ height: `${loginLogoSize}px` }}
                                className="max-w-[300px] object-contain"
                            />
                        </div>
                    )}
                    <CardTitle className="text-3xl font-bold tracking-tight">{loginTitle}</CardTitle>
                    <CardDescription>
                        {loginSubtitle}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="grid gap-4">
                        {error && (
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                                {error}
                            </div>
                        )}
                        <div className="grid gap-2">
                            <label htmlFor="email" className="text-sm font-medium">E-post</label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="namn@exempel.se"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="password" className="text-sm font-medium">Lösenord</label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" type="submit" disabled={loading} variant="premium">
                            {loading ? "Loggar in..." : (
                                <>
                                    Logga in <LogIn className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
