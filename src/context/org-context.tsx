"use client"

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react"
import { createClient } from "@/utils/supabase/client"

interface OrgContextValue {
    activeOrgId: string | null
    activeOrgName: string | null
    activeOrgLogo: string | null
    activeOrgColor: string
    loading: boolean
    refreshOrg: () => Promise<void>
}

const OrgContext = createContext<OrgContextValue>({
    activeOrgId: null,
    activeOrgName: null,
    activeOrgLogo: null,
    activeOrgColor: '#C9A84C',
    loading: true,
    refreshOrg: async () => {},
})

export function OrgProvider({ children }: { children: ReactNode }) {
    const supabase = useMemo(() => {
        try { return createClient() } catch { return null }
    }, [])

    const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
    const [activeOrgName, setActiveOrgName] = useState<string | null>(null)
    const [activeOrgLogo, setActiveOrgLogo] = useState<string | null>(null)
    const [activeOrgColor, setActiveOrgColor] = useState('#C9A84C')
    const [loading, setLoading] = useState(true)

    const fetchOrg = async () => {
        if (!supabase) { setLoading(false); return }
        try {
            // Read active_org_id from cookie via a fetch to avoid direct cookie access
            const res = await fetch('/api/active-org')
            if (res.ok) {
                const { orgId } = await res.json()
                if (orgId) {
                    setActiveOrgId(orgId)
                    const { data } = await supabase
                        .from('organisations')
                        .select('name, logo_url, primary_color')
                        .eq('id', orgId)
                        .single()
                    if (data) {
                        setActiveOrgName(data.name)
                        setActiveOrgLogo(data.logo_url)
                        setActiveOrgColor(data.primary_color || '#C9A84C')
                    }
                }
            }
        } catch { /* ignore */ }
        setLoading(false)
    }

    useEffect(() => { fetchOrg() }, [supabase])

    return (
        <OrgContext.Provider value={{
            activeOrgId,
            activeOrgName,
            activeOrgLogo,
            activeOrgColor,
            loading,
            refreshOrg: fetchOrg,
        }}>
            {children}
        </OrgContext.Provider>
    )
}

export function useActiveOrg() {
    return useContext(OrgContext)
}
