# Deploymentsguide: Medlemsregister

Följ denna guide för att installera och driftsätta systemet på **Supabase** (databas & auth) och **Vercel** (frontend).

## 1. Supabase Setup (Backend)

1.  **Skapa Projekt**: Gå till [supabase.com](https://supabase.com) och skapa ett nytt projekt.
2.  **Databas Schema**:
    - Gå till **SQL Editor** i din Supabase dashboard.
    - Kopiera innehållet från filen `supabase/migrations/20240222_initial_schema.sql` och kör det (Run).
    - Kopiera innehållet från `supabase/seed.sql` om du vill ha in exempeldata direkt.
3.  **Hämta API-nycklar**:
    - Gå till **Project Settings** > **API**.
    - Spara din `Project URL` och `anon public key`.
4.  **Konfigurera Authentication**:
    - Gå till **Authentication** > **Providers**.
    - Kontrollera att **Email** är aktiverat.
    - (Valfritt) Stäng av "Confirm email" om du vill kunna logga in direkt utan att verifiera e-posten.

## 2. Vercel Deployment (Frontend)

1.  **Pusha till GitHub**: Ladda upp din kod till ett privat GitHub-repository.
2.  **Importera till Vercel**:
    - Gå till [vercel.com](https://vercel.com) och klicka på **Add New** > **Project**.
    - Importera ditt repository.
3.  **Miljövariabler (Environment Variables)**:
    - Under fliken **Environment Variables** i Vercel, lägg till följande:
      - `NEXT_PUBLIC_SUPABASE_URL`: (Din Supabase Project URL)
      - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Din Supabase anon public key)
4.  **Deploy**: Klicka på **Deploy**. Vercel kommer automatiskt att bygga och publicera din applikation.

## 3. Hantera Inloggning

- Första gången du loggar in måste du ha en användare i Supabase Auth.
- Gå till **Supabase Dashboard** > **Authentication** > **Users** och klicka på **Add User** för att skapa din admin-inloggning manuellt första gången.

---
*Grattis! Ditt system är nu live på nätet.*
