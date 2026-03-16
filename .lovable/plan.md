

## Plan: Visa egna inlägg i flödet med subtil markering

### Ändringar

**1. FeedPage.tsx – Ta bort filter som exkluderar egna inlägg**
- Ta bort `.neq("user_id", user.id)` från both `life_posts` och `hangout_availability` queries så att egna inlägg inkluderas i flödet.
- Skicka en `isOwn` prop till alla feed-kort baserat på `item.userId === user.id`.

**2. FeedPostCard.tsx – Hantera egna inlägg**
- Lägg till `isOwn?: boolean` prop.
- Om `isOwn`: visa "Du" istället för `display_name`, lägg till en "Ditt inlägg"-pill med `bg-[#F7F3EF] border-[0.5px] border-[#DDD5CC]` bredvid kategori-pillen.
- Om `isOwn`: ersätt `<PostReactions>` med en "Se reaktioner"-länk (muted text, visas bara om det finns reaktioner). Klick på länken togglar en read-only vy av reaktionerna.

**3. FeedHangoutCard.tsx & FeedHealthCard.tsx – Samma mönster**
- Lägg till `isOwn?: boolean` prop, visa "Du" som namn, lägg till "Ditt inlägg"-pill.
- FeedHealthCard: dölj "Skicka kram"-knappen på egna inlägg.

**4. PostReactions.tsx – Lägg till read-only-läge**
- Lägg till en `readOnly?: boolean` prop. När `readOnly` är sant, visa bara befintliga reaktioner utan klickbarhet och utan "+"-knappen.

### Designdetaljer
- "Ditt inlägg"-pill: `text-[11px] font-medium px-2.5 py-0.5 rounded-[20px]`, bakgrund `#F7F3EF`, border `0.5px solid #DDD5CC`, textfärg `#7A6A85`.
- "Se reaktioner"-länk: `text-[11px] text-muted-foreground hover:underline`, visas som "Se reaktioner (3)" med antal.

