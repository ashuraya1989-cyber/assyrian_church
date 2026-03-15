"use server"

import { createClient } from "@/utils/supabase/server"

/**
 * logAuditAction — lightweight server action called by client components
 * after every create/update/delete/login/logout/export/settings operation.
 */
export async function logAuditAction(
    action: string,            // 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'email_sent' | 'settings'
    resource: string,          // 'family' | 'payment' | 'user' | 'settings' | 'auth' | 'income' | 'expense'
    resourceId: string = '',
    details: Record<string, unknown> = {}
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase.from('audit_logs').insert({
            user_id:     user.id,
            user_email:  user.email,
            action,
            resource,
            resource_id: resourceId || null,
            details,
        })
    } catch {
        // fire-and-forget — never block the UI
    }
}
