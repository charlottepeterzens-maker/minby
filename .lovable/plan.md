

## Problem
Utvecklarverktyg-sektionen visas bara om din e-post innehåller "charlotte" (rad 300 i SettingsPage.tsx). Om du är inloggad med ett annat konto (t.ex. "chaluda" eller liknande) syns den inte.

## Lösning
Uppdatera villkoret så att det matchar din faktiska e-postadress. Två alternativ:

**Alt A – Bredda villkoret** till att också matcha "chaluda" (eller ta bort e-postfiltret helt och använda admin-rollen istället).

**Alt B – Logga in med rätt konto** som har "charlotte" i e-posten.

### Rekommendation
Ändra villkoret på rad 300 i `SettingsPage.tsx` från:
```tsx
{user?.email?.includes("charlotte") && (
```
till att matcha din e-post, t.ex.:
```tsx
{(user?.email?.includes("charlotte") || user?.email?.includes("chaluda")) && (
```

Alternativt kan vi använda admin-rollkontroll via `useAdminRole`-hooken som redan finns i projektet, vilket är renare och inte binder det till en specifik e-post.

### Teknisk detalj
- En rad ändras i `src/pages/SettingsPage.tsx`
- Inget annat påverkas

