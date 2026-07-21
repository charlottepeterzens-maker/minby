# Minby

> För de som vill ses – inte bara synas.

Minby är en svensk social app byggd för familj, nära vänner och små kretsar. Fokus ligger på relationer, inte räckvidd. Appen ska hjälpa människor att hålla kontakt, dela vardagen och planera att ses – utan algoritmer, reklam eller social press.

---

# Vision

De flesta sociala medier är byggda för att skapa uppmärksamhet.

Minby är byggd för att skapa närhet.

Målet är att användaren ska:

- öppna appen
- se vad som händer i sin krets
- planera något tillsammans
- stänga appen och leva livet

---

# Designprinciper

## Människor före funktioner

Ansikten och relationer ska alltid komma före teknik.

## Context → Action

Visa först sammanhanget.
Låt sedan användaren agera.

## Progressive disclosure

Visa bara det användaren behöver just nu.

## White space är ett designelement

Luft är viktigare än fler komponenter.

## Ett primärt val

Varje vy ska ha en tydlig huvudhandling.

## Återanvänd före nytt

Komponenter ska återanvändas i första hand.

---

# Teknik

Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

Backend

- Supabase
- PostgreSQL
- Realtime
- Auth
- Storage
- Edge Functions

---

# Mappstruktur

```
src/
    components/
    hooks/
    integrations/
    lib/
    pages/
    types/

public/

supabase/
    functions/
    migrations/
```

---

# Viktiga funktioner

## Kretsar

Privata grupper med familj eller nära vänner.

## Min vardag

Dela bilder från vardagen.

## Tips

Tips om böcker, filmer, recept, platser m.m.

Kan skapas:

- med länk
- utan länk
- med egen bild

Link Preview hämtas via Edge Function.

## Ses vi?

Planera aktiviteter tillsammans.

## Chatt

En chatt per krets.

## Inbjudningar

Användare kan bjudas in via Magic Link.

---

# Viktiga Edge Functions

## fetch-link-preview

Hämtar metadata från webbsidor.

Returnerar

- title
- image
- storagePath

Laddar vid behov upp bild till Supabase Storage.

---

## get-invite-preview

Returnerar information om en inbjudan.

---

## accept-circle-invite

Lägger till användaren i en krets.

---

# Databas

Viktiga tabeller

- profiles
- circles
- circle_members
- messages
- feed_posts
- tips
- activities
- friendships
- notifications

---

# Designsystem

## Typsnitt

Outfit

## Radius

Kort:
28 px

Bilder:
24 px

Bottom Sheets:
28 px

## Kort

- inga borders
- stora radier
- mycket luft

## CTA

Orange understruken text.

Undvik fyllda knappar.

---

# Färger

## Bakgrund

- #F9F3E1
- #F2ECE3
- #F0EAE2

## Text

- #2B2B2B
- #561828
- #675332

## Accent

- #C85A2E
- #DAEAF6

---

# UX-principer

Minby ska kännas:

- varm
- lugn
- mänsklig
- personlig

Aldrig:

- stressig
- skrikig
- beroendeframkallande

---

# Kom igång

Installera beroenden

```bash
npm install
```

Starta projektet

```bash
npm run dev
```

Bygg produktion

```bash
npm run build
```

---

# Deployment

Frontend hanteras via Lovable.

Backend deployas via Supabase.

Edge Functions deployas med:

```bash
supabase functions deploy
```

---

# Kodprinciper

- TypeScript överallt.
- Små komponenter.
- Återanvänd komponenter.
- Ingen duplicerad logik.
- Skriv tydliga funktionsnamn.
- Kommentera varför, inte vad.

---

# Framtida funktioner

- AI-sammanfattning av länkar
- Familjekalender
- Delade listor
- Påminnelser
- Gemensamma fotoalbum
- Widgets
- Apple Watch
- Android Widget

---

# Projektmål

Minby ska vara den app människor öppnar för att komma närmare sina viktigaste relationer – och sedan lägga undan telefonen.
