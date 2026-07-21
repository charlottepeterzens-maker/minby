
# minby v1.0 — omstrukturering

Full nystart: rensa gammal data, ny datamodell centrerad kring **kretsen**, ny routing, ny AI-per-krets. Magic link för verifiering, AI-sammanfattning cachead per krets och auto-genereras vid besök.

## Ny informationsarkitektur

**Routing (allt annat tas bort):**
```
/                    → Egen profil (Ses vi?, kretsar, foton, tips)
/circle/:circleId    → Krets-sida (hero, AI-summering, Ses vi?, chatt-preview, tips, album)
/chat/:circleId      → Full chattvy
/invite/:token       → Landing → magic link
/verify              → Magic link handoff
```

Ingen `/feed`, `/friends`, `/groups`, `/notifications`, `/admin`, `/settings` som toppnavigation. Ingen bottom nav — navigation sker via kretskort på profilen och tillbaka-knapp i kretsen.

## Domänmodell

```text
users (auth.users + profiles)
  └─ profiles: display_name, avatar_url

circles                              (kretsen — central enhet)
  ├─ hero_image_url, name, created_by
circle_members (user_id, circle_id, joined_at)
circle_invites (token, circle_id, created_by, expires_at)
circle_ai_summary (circle_id, content, generated_at)   — cache, 1 rad per krets

messages (circle_id, user_id, body, kind, payload_json, created_at)
  kind: 'text' | 'meeting_suggestion' | 'system'

meetings (circle_id, created_by, date, title, description)  — "Ses vi?"
meeting_responses (meeting_id, user_id, status)             — kan/kan inte

photos (id, owner_id, storage_path, caption, created_at)
photo_visibility (photo_id, circle_id)     — samma foto → flera kretsar

tips (id, owner_id, title, url, comment, category, created_at)
tip_visibility (tip_id, circle_id)         — samma tips → flera kretsar
```

**Ägarskap:** Fotot/tipset ägs av användaren; synligheten styrs av *_visibility per krets. Meddelanden/möten/album/AI ägs av kretsen.

## Migration (rensa allt utom auth + profiles)

Dropp: `friend_access_tiers`, `friend_requests`, `friend_groups`, `group_memberships`, `group_memories`, `group_messages`, `group_polls`, `hangout_availability`, `hangout_comments`, `hangout_responses`, `hangout_tagged_friends`, `life_posts`, `life_sections`, `message_reactions`, `notifications`, `period_entries`, `plans`, `poll_votes`, `post_comments`, `post_reactions`, `profile_settings`, `push_subscriptions`, `rsvps`, `saved_tips`, `tip_comments`, `user_tips`, `workout_entries`, `invite_links`, `app_translations`, `user_roles`.

Skapa ovanstående nya tabeller med GRANTs, RLS och policies scopade via `circle_members` (SECURITY DEFINER `is_circle_member(_circle_id)`), samt trigger som lägger `created_by` som member vid `INSERT` på `circles`.

Storage: behåll `avatars`. Skapa ny privat bucket `circle-hero`, ny privat bucket `circle-photos`. Ta bort `life-images`, `group-avatars`.

Ta bort edge functions som inte används: `parse-hangout`, `chat-summary`, `cleanup-old-hangouts`, `scheduled-nudges`, `accept-invite-friendship`, `get-invite-preview`, `send-push*`, `generate-vapid-keys`, `fetch-link-preview`, `seed-test-users`, `delete-account`.

Nya edge functions:
- `verify-invite` — validerar token, returnerar kretsförhandsvisning (public).
- `join-circle` — auth-required, lägger user i `circle_members`.
- `generate-circle-summary` — kör Lovable AI mot kretsens senaste innehåll, skriver till `circle_ai_summary`. Anropas från klient vid besök om cache är >6h gammal.

## Auth

Endast **magic link (e-post)** via `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: <origin>/verify }})`. Inbjudningsflöde: `/invite/:token` visar krets-preview → e-postfält → magic link skickas med `redirectTo=/verify?token=<invite>` → `/verify` läser hash-session, kör `join-circle`, redirectar till `/circle/:id`.

## Sidor (frontend)

**`/` — Egen profil**
- Header med användarens namn/avatar + kugghjul (logga ut, radera konto).
- Sektion "Ses vi?" — aggregerad lista av alla `meetings` från alla kretsar användaren är med i (kommande datum), grupperat per krets.
- Sektion "Mina kretsar" — kort med hero-thumb, namn, medlemsinitialer → klick går till `/circle/:id`. "+ Skapa krets" som textlänk.
- Sektion "Mina foton" — grid av användarens `photos`, klick öppnar lightbox med kretsval för synlighet.
- Sektion "Mina tips" — lista av användarens `tips`.

**`/circle/:id` — Krets-sida** (enligt referensbild `Krets-sida.png`)
- Hero: `hero_image_url` med kretsnamn + medlemsnamn overlay.
- "Sedan sist" (AI): sand-färgat kort med `circle_ai_summary.content` + datum. Auto-refresh om > 6h.
- "Våra förslag att ses": horisontell rad med `meetings`-kort → "+ Föreslå en träff".
- "Chatt": senast uppdaterad-rad + AI-mini-sammanfattning + "Se hela chatten" → `/chat/:id`.
- "Våra tips": horisontell rad med tips-thumbs → "+ Lägg till tips" (öppnar bottom sheet).
- "Våra foton": horisontell rad med foto-thumbs → "+ Lägg foto".

**`/chat/:id`** — Full chattvy med AI Elements-liknande komponerad UI (assistant utan bakgrund, användarbubbla i burgundy). Support för `meeting_suggestion` som specialkort med "Jag kan / Kan inte".

**Bottom sheets** (enligt uppladdade referenser)
- Chatt-composer, tips-composer med kategori-pills, foto-uppladdning. Alla `rounded-lg`, burgundy skickaknapp.

## Designsystem

Enligt `00-ColorTokens_1.png`: burgundy /900 (`#561828`), coral /500, cream, sand, blå-blå/gul/sand-pills för kategorier. Uppdatera `index.css` med semantiska tokens:
- `--action-primary` (burgundy), `--action-accent` (coral), `--action-destructive` (röd)
- `--bg-app`, `--bg-card`, `--bg-raised` (blue/100), `--bg-sage`, `--bg-sand`
- `--text-primary/secondary/muted/faint`
- Kategori-pill-tokens (8 varianter).

Endast Outfit-font. Rounded-lg. Borderless. Inga pill-shapes.

## Vad tas bort ur kodbasen

Alla filer under `src/pages/` utom nya (`ProfilePage`, `CirclePage`, `ChatPage`, `InvitePage`, `VerifyPage`, `NotFound`). Alla komponenter under `src/components/profile`, `src/components/feed`, `src/components/chat`, `src/components/onboarding`, `src/components/admin`, plus `PlanCard`, `PWAInstallBanner`, `PushPermissionDialog`, `HeroSection`, `CurvedSeparator`, `ShareNewSheet`, `CreateGroupDialog`, `CreatePlanDialog`, `OnboardingFlow`. Hooks: behåll `use-toast`, `use-mobile`, `useSignedImageUrl`. Ta bort resten.

## Leveransordning i ett svep

1. **DB-migration** — drop + create + RLS + GRANTs + triggers + storage buckets.
2. **Rensa filer** — ta bort gamla pages, components, hooks, edge functions.
3. **Ny routing** i `App.tsx` (5 routes, ingen bottom nav).
4. **Edge functions** — `verify-invite`, `join-circle`, `generate-circle-summary`.
5. **Design tokens** — uppdatera `index.css` + `tailwind.config.ts`.
6. **Sidor + komponenter** — Profile, Circle, Chat, Invite, Verify + bottom sheets.
7. **Auth** — konfigurera magic link + inaktivera lösenordsflöde.

## Vad som inte ingår (v2)

Global sökning, push-notifieringar, hero-bildval-UI (i v1: standard-bild vid krets-skapande, kan bytas via edit-sheet), telefonlogin, smeknamn.

---

**Risker att flagga:**
- Detta är destruktivt. All befintlig data i tabellerna ovan raderas permanent. Bekräfta genom att godkänna migrationen när den kommer.
- Preview kommer vara trasig under bygget tills alla filer landat.
- Radering av tabeller kräver att RLS-beroende koder inte längre refererar dem — jag rensar frontend samtidigt.

Godkänn planen så börjar jag med migrationen.
