import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        return supabaseResponse
    }

    try {
        const supabase = createServerClient(url, key, {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        })

        const {
            data: { user },
        } = await supabase.auth.getUser()

        const pathname = request.nextUrl.pathname

        if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/auth')) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            return NextResponse.redirect(url)
        }

        // --- Set active org context from cookie ---
        const activeOrgId = request.cookies.get('active_org_id')?.value
        if (activeOrgId && user) {
            await supabase.rpc('set_current_org', { org_id: activeOrgId })
        }

        // --- RBAC / Route Protection Logic ---
        if (user && !pathname.startsWith('/login') && !pathname.startsWith('/auth')) {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role, permissions')
                .eq('id', user.id)
                .single()

            if (profile) {
                const { role, permissions } = profile

                // Super admin route protection
                if (pathname.startsWith('/super-admin')) {
                    if (role !== 'superadmin') {
                        const url = request.nextUrl.clone()
                        url.pathname = '/'
                        return NextResponse.redirect(url)
                    }
                }

                // Map paths to permission keys
                const routePermissionMap: Record<string, string> = {
                    '/register': 'register',
                    '/betalningar': 'payments',
                    '/utgifter': 'expenses',
                    '/intakter': 'income',
                    '/statistik': 'stats',
                    '/installningar': 'settings',
                    '/anvandare': 'users'
                }

                // Superadmins and admins can access anything
                if (role !== 'superadmin' && role !== 'admin') {
                    for (const [route, perm] of Object.entries(routePermissionMap)) {
                        if (pathname.startsWith(route)) {
                            if (!permissions || !Array.isArray(permissions) || !permissions.includes(perm)) {
                                const url = request.nextUrl.clone()
                                url.pathname = '/'
                                return NextResponse.redirect(url)
                            }
                        }
                    }

                    if ((pathname.startsWith('/installningar') || pathname.startsWith('/anvandare')) && role === 'user') {
                        const url = request.nextUrl.clone()
                        url.pathname = '/'
                        return NextResponse.redirect(url)
                    }
                }

                // Redirect to login if user has no active org and is not on login page
                if (!activeOrgId && !pathname.startsWith('/login') && !pathname.startsWith('/super-admin') && role !== 'superadmin') {
                    const url = request.nextUrl.clone()
                    url.pathname = '/login'
                    return NextResponse.redirect(url)
                }
            }
        }
    } catch (e) {
        console.error('Middleware auth error:', e)
    }

    return supabaseResponse
}
