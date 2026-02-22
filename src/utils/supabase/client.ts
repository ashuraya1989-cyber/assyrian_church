import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Fallback for build time to prevent @supabase/ssr from throwing
    if (!url || !key) {
        return {} as any
    }

    return createBrowserClient(url, key)
}
