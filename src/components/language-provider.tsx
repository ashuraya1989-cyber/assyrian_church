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
        "common.save": "Spara",
        "page.register.title": "Familjeregister",
        "page.register.desc": "Hantera föreningens medlemmar och familjer.",
        "page.register.add": "Lägg till familj",
        "page.register.search": "Sök på efternamn, namn eller ort...",
        "table.family_name": "Familjenamn",
        "table.parents": "Föräldrar",
        "table.mobile": "Mobil",
        "table.city": "Ort",
        "table.actions": "Åtgärder",
        "table.empty_search": "Inga familjer matchar din sökning.",
        "table.empty_register": "Inga familjer registrerade än."
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
        "common.save": "Save",
        "page.register.title": "Family Registry",
        "page.register.desc": "Manage the association's members and families.",
        "page.register.add": "Add family",
        "page.register.search": "Search by surname, name or city...",
        "table.family_name": "Family Name",
        "table.parents": "Parents",
        "table.mobile": "Mobile",
        "table.city": "City",
        "table.actions": "Actions",
        "table.empty_search": "No families match your search.",
        "table.empty_register": "No families registered yet."
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
