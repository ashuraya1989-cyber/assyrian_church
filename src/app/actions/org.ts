"use server"

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { logAuditAction } from './audit'

function getServiceRoleClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase miljövariabler saknas.')
    }
    return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })
}

async function getAuthClient() {
    const cookieStore = await cookies()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    return createServerClient(url, key, {
        cookies: {
            getAll() { return cookieStore.getAll() },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                } catch { }
            },
        },
    })
}

export async function setActiveOrganisation(orgId: string) {
    const cookieStore = await cookies()
    const supabase = await getAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Ej inloggad")

    // Superadmin can access any org
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'superadmin') {
        // Verify membership
        const { data } = await supabase
            .from('organisation_members')
            .select('id, role')
            .eq('user_id', user.id)
            .eq('organisation_id', orgId)
            .single()

        if (!data) throw new Error("Inte behörig till den organisationen")
    }

    cookieStore.set('active_org_id', orgId, {
        httpOnly: true, secure: true, sameSite: 'lax', path: '/'
    })
    return { success: true }
}

export async function getMyOrganisations() {
    const supabase = await getAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    // Superadmin sees all orgs
    if (profile?.role === 'superadmin') {
        const { data: orgs } = await supabase
            .from('organisations')
            .select('*')
            .eq('is_active', true)
            .order('name')
        return (orgs ?? []).map(org => ({
            ...org,
            member_role: 'superadmin' as const,
        }))
    }

    // Regular users see their memberships
    const { data: memberships } = await supabase
        .from('organisation_members')
        .select('organisation_id, role, permissions, organisations(id, name, slug, logo_url, primary_color, is_active)')
        .eq('user_id', user.id)
        .eq('is_active', true)

    if (!memberships) return []

    return memberships
        .filter((m: any) => m.organisations?.is_active)
        .map((m: any) => ({
            id: m.organisations.id,
            name: m.organisations.name,
            slug: m.organisations.slug,
            logo_url: m.organisations.logo_url,
            primary_color: m.organisations.primary_color,
            member_role: m.role,
            member_permissions: m.permissions,
        }))
}

export async function createOrganisation(formData: FormData) {
    try {
        const supabase = await getAuthClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Ej inloggad")

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'superadmin') {
            throw new Error("Endast superadmins kan skapa organisationer")
        }

        const name = formData.get('name') as string
        const slug = formData.get('slug') as string
        const primaryColor = (formData.get('primary_color') as string) || '#C9A84C'

        if (!name || !slug) throw new Error("Namn och slug krävs")

        const adminClient = getServiceRoleClient()
        const { data: org, error } = await adminClient
            .from('organisations')
            .insert({
                name,
                slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                primary_color: primaryColor,
                created_by: user.id,
            })
            .select()
            .single()

        if (error) throw error

        // Create default app_settings for the new org
        await adminClient
            .from('app_settings')
            .insert({
                organisation_id: org.id,
                admin_title: name,
                login_title: 'Välkommen',
                login_subtitle: `Logga in på ${name}`,
            })

        await logAuditAction('create', 'organisation', org.id, { name, slug })

        return { success: true, organisation: org }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getActiveOrgId(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get('active_org_id')?.value ?? null
}

export async function getAllOrganisations() {
    const supabase = await getAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'superadmin') return []

    const adminClient = getServiceRoleClient()
    const { data: orgs } = await adminClient
        .from('organisations')
        .select('*, organisation_members(count)')
        .order('created_at', { ascending: false })

    return orgs ?? []
}

export async function updateOrganisation(orgId: string, data: { name?: string; slug?: string; is_active?: boolean; primary_color?: string; logo_url?: string }) {
    try {
        const supabase = await getAuthClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Ej inloggad")

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'superadmin') {
            throw new Error("Endast superadmins kan uppdatera organisationer")
        }

        const adminClient = getServiceRoleClient()
        const { error } = await adminClient
            .from('organisations')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', orgId)

        if (error) throw error

        await logAuditAction('update', 'organisation', orgId, data)
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function addOrgMember(orgId: string, userId: string, role: string, permissions: string[]) {
    try {
        const adminClient = getServiceRoleClient()
        const { error } = await adminClient
            .from('organisation_members')
            .upsert({
                organisation_id: orgId,
                user_id: userId,
                role,
                permissions,
                is_active: true,
            }, { onConflict: 'organisation_id,user_id' })

        if (error) throw error

        await logAuditAction('create', 'organisation_member', orgId, { userId, role })
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getOrgMembers(orgId: string) {
    const adminClient = getServiceRoleClient()
    const { data } = await adminClient
        .from('organisation_members')
        .select('*, user_profiles(email, role)')
        .eq('organisation_id', orgId)
        .order('created_at')
    return data ?? []
}
