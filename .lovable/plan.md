## Analys av nuvarande flöde

**Fungerar redan bra**
- `/invite/:token` finns med token-validering via edge function `get-invite-preview`.
- `pending_invite_token` sparas i sessionStorage och plockas upp efter inloggning i `AuthPage`.
- Efter accept läggs användaren till i `circle_members` och navigeras till `/circle/:id`.
- Design system-komponenter (`TextButton`, `BottomSheet`, färger) finns att återanvända.

**Avviker från spec**
- Invite-sidan visar bara kretsens namn — ingen medlemslista, ingen Minby-beskrivning, ingen värme.
- Registrering kräver namn + lösenord innan man får gå med (hög tröskel). Specen säger *endast e-post*.
- Ingen automatisk anslutning efter e-postverifiering — användaren måste tillbaka till länken.
- Ingen välkomstkort/onboarding i kretsen efter medlemskap.
- Namn, profilbild och övrigt samlas inte in stegvis efteråt.

**Återanvänds**
- `get-invite-preview` edge function (utökas med members-lista).
- `InvitePage`, `AuthPage`, `CirclePage`, `BottomSheet`, `TextButton`, befintlig avatar/initials-logik.
- `pending_invite_token` mönstret.

## Förändringar

### 1. `get-invite-preview` (edge function)
Returnera även medlemmarnas `display_name` + `avatar_url` (max ~8) så invite-sidan kan visa dem.

### 2. `InvitePage` — Välkomstsida
Ny layout enligt "människor före funktioner":
- Eyebrow: "du är inbjuden till"
- Kretsens namn (stor, Fraunces/Outfit heading)
- Medlemsrad: staplade avatarer + "Sara, Anna, Lisa och 2 till är redan här"
- Kort Minby-beskrivning: *"Minby är ett lugnt hem för din närmsta krets. Här delar ni vardagen, planerar träffar och håller kontakten — utan algoritmer."*
- Primär CTA: **"Gå med i {krets}"** (för inloggade → direkt join, för ej inloggade → magic link-flöde)
- Sekundärt: "Har du redan konto? Logga in"

### 3. Låg-tröskel-registrering via magiclink
- Ny minimalistisk vy i `InvitePage` (samma sida, ingen navigering bort): endast e-postfält + knapp "Skicka länk".
- Använd `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/invite/${token}` } })`.
- När användaren klickar på länken i mejlet landar de på `/invite/:token` igen; `AuthContext` upptäcker session, `InvitePage` auto-accepterar inbjudan och redirectar till `/circle/:id`.
- Inget lösenord, inget namn krävs för att bli medlem.
- `AuthPage`s befintliga lösenordsflöde lämnas orört som alternativ för användare utan invite.

### 4. Auto-join efter verifiering
`InvitePage` triggar `accept()` automatiskt när `user` finns och status är `ok` (istället för att kräva knappklick).

### 5. Välkomstkort i `CirclePage`
- Ny komponent `WelcomeToCircleCard` (återanvänder `PageCard`-mönstret och design-tokens).
- Visas överst i kretsen om användaren precis blivit medlem OCH inte gjort någon aktivitet (varken meddelande, tips, foto eller träff-svar).
- Innehåll: kort välkomsttext, kort Minby-beskrivning, CTA-knapp "Skriv hej i chatten" → `/chat/:id`.
- Dismissas automatiskt när användaren skickat sitt första meddelande i kretsen (checka `messages` för `user_id` + `circle_id`). Ingen ny tabell krävs.

### 6. Stegvis profil-onboarding (icke-blockerande)
- Ny lättviktskomponent `ProfileNudge` som visas i kretsens topp när användaren saknar `display_name` eller `avatar_url`.
- Inline-fält, ett steg i taget: namn → bild → klart. Alltid "Hoppa över"-länk.
- Ingen modal, ingen blockering av appen.

### 7. Copy-pass
- Ersätt "Länken fungerar inte" → "Den här inbjudan har gått ut" / "Vi hittar inte den här inbjudan".
- Använd konsekvent tonalitet: *"Flytta din krets till Minby."* som stödtext på invite-sidan.

## Tekniska detaljer

- Inga schemaändringar: `messages`, `profiles`, `circle_members` räcker.
- `signInWithOtp` fungerar mot befintlig Supabase Auth utan konfigändring (email-magiclink är på som default).
- `emailRedirectTo` pekar tillbaka på invite-URL:en, så flödet är slutet.
- `handle_new_user`-triggern skapar redan `profiles` row vid signup — display_name blir tom och fylls i via `ProfileNudge`.
- Filer som ändras: `supabase/functions/get-invite-preview/index.ts`, `src/pages/InvitePage.tsx`, `src/pages/CirclePage.tsx`. Nya: `src/components/circle/WelcomeToCircleCard.tsx`, `src/components/profile/ProfileNudge.tsx`.
- Deploy: `get-invite-preview` edge function.
