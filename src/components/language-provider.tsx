"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'sv' | 'en'

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
}

const translations = {
    sv: {
        "nav.dashboard": "Summering",
        "nav.register": "Register",
        "nav.payments": "Betalningar",
        "nav.expenses": "Utgifter",
        "nav.income": "Intäkter",
        "nav.stats": "Statistik",
        "nav.logout": "Logga ut",
        "app.title": "Medlemsregister",
        "common.search": "Sök...",
        "common.cancel": "Avbryt",
        "common.save": "Spara"
    },
    en: {
        "nav.dashboard": "Dashboard",
        "nav.register": "Register",
        "nav.payments": "Payments",
        "nav.expenses": "Expenses",
        "nav.income": "Income",
        "nav.stats": "Statistics",
        "nav.logout": "Log out",
        "app.title": "Member Registry",
        "common.search": "Search...",
        "common.cancel": "Cancel",
        "common.save": "Save"
    }
}

const LanguageContext = createContext<LanguageContextType>({
    language: 'sv',
    setLanguage: () => { },
    t: (key: string) => key
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('sv')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem('app-language') as Language
        if (saved && (saved === 'sv' || saved === 'en')) {
            setLanguage(saved)
        }
    }, [])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem('app-language', lang)
    }

    const t = (key: string) => {
        // @ts-ignore
        const text = translations[language]?.[key]
        return text || key
    }

    // Hide context until mounted to avoid hydration mismatch
    if (!mounted) {
        return <div style={{ visibility: 'hidden' }}>{children}</div>
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export const useLanguage = () => useContext(LanguageContext)
