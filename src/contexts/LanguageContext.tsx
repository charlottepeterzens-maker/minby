import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Lang = "en" | "sv";

const translations = {
  en: {
    // Nav
    home: "Home",
    friends: "Friends",
    share: "Share",
    notifications: "Notifications",
    profile: "Profile",
    settings: "Settings",

    // Settings
    changePassword: "Change password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    updatePassword: "Update password",
    updating: "Updating...",
    passwordTooShort: "Password too short",
    passwordTooShortDesc: "Must be at least 6 characters.",
    passwordsDontMatch: "Passwords don't match",
    passwordUpdated: "Password updated!",
    error: "Error",

    notificationPreferences: "Notification preferences",
    friendRequests: "Wants to join your circle",
    gatheringInvites: "Gathering invites",
    newLifeUpdates: "New life updates from your circle",

    language: "Language",
    english: "English",
    swedish: "Svenska",

    howWeUseData: "How we use your data",
    dataPrivacy1: "Your life updates are only shared with people you've explicitly granted access to, based on the tier you assign them (Close, Inner, Outer).",
    dataPrivacy2: "We never sell your personal data or share it with third parties. Your content stays between you and your circle.",
    dataPrivacy3: "You can delete your account and all associated data at any time by contacting us.",

    logOut: "Log out",
    signedInAs: "Signed in as",

    // Feed
    loadingFeed: "Loading your feed...",
    noUpdates: "No updates yet",
    noUpdatesFilter: "No updates for this filter",
    addFriendsHint: "Invite people to your circle and assign access tiers to see their life updates here",
    all: "All",
    posts: "Posts",
    workouts: "Workouts",
    period: "Period",
    plans: "Plans",
    someone: "Someone",
    group: "Group",
    plan: "Plan",

    // Profile
    profileTitle: "My Page",
    sections: "Sections",
    noSectionsYet: "No sections yet",
    addFirstSection: "Add your first life section",
    nothingSharedYet: "Nothing shared yet",
    shareLifeHint: "Share your kids, workouts, pregnancy, hobbies & more",
    lifeUpdates: "Life updates",
    accessLevels: "Access levels on your sections",
    close: "Close",
    innerCircle: "Inner circle",
    everyone: "Everyone",
    loading: "Loading...",
    anonymous: "Anonymous",
    addQuoteOrBio: "Add a quote or bio...",

    // Friends page
    searchFriends: "Search friends...",
    noFriendsYet: "No friends yet",
    noMatches: "No matches",
    joinCirclesHint: "Join circles to connect with friends",
    setTier: "Set tier...",
    couldNotUpdateTier: "Could not update tier",
    updated: "Updated!",

    // Notifications page
    markAllRead: "Mark all read",
    noNotificationsYet: "No notifications yet",
    notificationsHint: "You'll see gathering invites, friend requests, and updates here",

    // Auth page
    joinMinby: "Join MINBY",
    welcomeBack: "Sign in",
    startPlanning: "Start planning real moments with your people",
    yourFriendsWaiting: "Sign in to continue",
    yourName: "Your name",
    howFriendsKnowYou: "How your friends know you",
    email: "Email",
    password: "Password",
    createAccount: "Create account",
    signIn: "Sign in",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    signUp: "Sign up",
    checkEmail: "Check your email to confirm your account!",

    // Share sheet
    shareNew: "Share something new",
    lifeUpdate: "Life update",
    shareWithCircles: "Share with your circles",
    suggestMeeting: "Suggest meeting",
    gatherFriends: "Gather your friends",
    section: "Section",
    chooseSection: "Choose a life section",
    whatsNew: "What's happening in your life?",
    shareUpdatePlaceholder: "Share something with your close ones...",
    back: "Back",
    couldntPost: "Couldn't post update",
    updateShared: "Update shared!",
    chooseGroup: "Choose a group",
    emoji: "Emoji",
    whatsThePlan: "What's the plan?",
    when: "When?",
    whereOptional: "Where? (optional)",
    vibe: "Vibe",
    vibeChill: "Chill",
    vibeAdventure: "Adventure",
    vibeCreative: "Creative",
    vibeSelfcare: "Self-care",
    suggest: "Suggest",
    couldntCreateSuggestion: "Couldn't create suggestion",
    meetingSuggested: "Meeting suggested!",

    // Create group dialog
    newGroup: "New group",
    createFriendGroup: "Create a friend group",
    pickEmoji: "Pick an emoji",
    groupName: "Group name",
    groupNamePlaceholder: "Besties, Work crew, Neighbors...",
    createGroup: "Create group",
    couldntCreateGroup: "Couldn't create group",
    groupCreated: "Group created!",

    // Create plan dialog
    newPlan: "New plan",
    whatFeelLikeDoing: "What do you feel like doing?",
    planTitlePlaceholder: "Cinema night, painting session, wine & chat...",
    planDatePlaceholder: "March 11, Last weekend in June...",
    planLocationPlaceholder: "My place, downtown, the park...",
    shareWithGroup: "Share with the group",
    couldntCreatePlan: "Couldn't create plan",
    planShared: "Plan shared!",

    // Create section dialog
    addSection: "Add section",
    addLifeSection: "Add a life section",
    name: "Name",
    sectionNamePlaceholder: "e.g. My garden",
    whoCanSee: "Who can see this?",
    closeFriendsOnly: "Close friends only",
    innerCircleCloser: "Inner circle & closer",
    allFriends: "All friends",
    creating: "Creating...",
    createSection: "Create section",
    couldNotCreateSection: "Could not create section",

    // Friend tier manager
    joinGroupsFirst: "Join groups first to manage friend access tiers",
    friendAccessTiers: "Friend access tiers",

    // Workout tracker
    logWorkout: "Log workout",
    durationMinutes: "Duration (minutes)",
    saveWorkout: "Save workout",
    couldNotLogWorkout: "Could not log workout",
    workoutLogged: "Workout logged!",
    thisWeek: "this week",

    // Period tracker
    logToday: "Log today",
    flowLevel: "Flow level",
    flowLight: "Light",
    flowMedium: "Medium",
    flowHeavy: "Heavy",
    symptoms: "Symptoms",
    symptomCramps: "Cramps",
    symptomHeadache: "Headache",
    symptomFatigue: "Fatigue",
    symptomBloating: "Bloating",
    symptomMoodSwings: "Mood swings",
    symptomBackPain: "Back pain",
    saveEntry: "Save entry",
    couldNotLog: "Could not log",
    logged: "Logged!",
    dayOfCycle: "Day {0} of cycle",

    // Life section card
    tierClose: "Close",
    tierInner: "Inner",
    tierAll: "All",
    closeOnly: "Close only",
    innerPlus: "Inner+",
    photo: "Photo",
    pasteLink: "Paste a link...",
    noUpdatesYet: "No updates yet",
    couldNotPost: "Could not post",
    couldNotUpdateSection: "Could not update section",
    sectionUpdated: "Section updated",
    hangoutAvailability: "I want to hang out!",
    addAvailability: "Add a date",
    selectDate: "Select a date",
    activities: "Activities",
    activityNature: "Nature",
    activityFoodOut: "Food out",
    activityRelax: "Relax",
    activityShopping: "Shopping",
    activitySports: "Sports",
    activityCoffee: "Coffee",
    activityMovies: "Movies",
    activityGames: "Games",
    customNote: "Or type something...",
    save: "Save",
    noAvailability: "No dates marked yet",
    availabilitySaved: "Availability saved!",
    couldNotSaveAvailability: "Could not save availability",
    availabilityRemoved: "Removed",
    couldNotRemoveAvailability: "Could not remove",
    freeDates: "Free dates",
    shareWhenFree: "Let friends know when you're free",
    editAvailability: "Edit",
    comments: "Comments",
    addComment: "Add a comment...",
    shareProfile: "Share profile",
    addFriend: "Add to my circle",
    friendsStatus: "In your circle",
    requestPending: "Pending",
    requestSent: "Sent!",
    accept: "Yes, gladly",
    couldNotSendRequest: "Could not send request",
    friendRequestReceived: "Wants to join",
    wantsToBeYourFriend: "wants to be part of your everyday",
    friendRequestAccepted: "Now in your circle!",
    acceptedYourRequest: "is now part of your everyday",
    friendAdded: "Added to your circle!",
    hangoutSuggestions: "Hangout matches",
    reorderSections: "Reorder",

    // Tips & Favorites
    tipsSectionTitle: "Tips & favorites",
    addTip: "Add tip",
    tipTitlePlaceholder: "What do you recommend?",
    tipUrlPlaceholder: "Link (optional)",
    tipAddImage: "Add image",
    tipImageChanged: "Image added",
    tipLimitReached: "Limit reached",
    tipLimitDesc: "You can have max 5 favorites at a time. Remove one first.",
    tipCountInfo: "{0} of {1} tips",
    tipEmptyTitle: "Share your best tips",
    tipEmptyDesc: "Skincare, restaurants, podcasts, books...",
    tipCat_skincare: "Skincare",
    tipCat_food: "Food & drink",
    tipCat_podcast: "Podcast",
    tipCat_book: "Book",
    tipCat_show: "Show",
    tipCat_salon: "Salon",
    tipCat_workout: "Workout",
    tipCat_product: "Product",
    tipCat_other: "Other",
    tipFetchingPreview: "Fetching preview...",
    tipPreviewFound: "Preview image from link",
    tipCommentPlaceholder: "Your comment about this tip",
    tipEdit: "Edit",
    tipDelete: "Delete",
    tipSave: "Save changes",

    // Hangout sections
    hangoutAvailable: "Available",
    hangoutConfirmed: "Confirmed date",
    hangoutConfirmedLabel: "Confirmed dates",
    hangoutAvailableLabel: "Available & want to meet",
    hangoutNoConfirmed: "No confirmed dates yet",
    hangoutNoAvailable: "No available dates yet",
  },
  sv: {
    // Nav
    home: "Hem",
    friends: "Min krets",
    share: "Dela",
    notifications: "Aviseringar",
    profile: "Profil",
    settings: "Inställningar",

    // Settings
    changePassword: "Byt lösenord",
    newPassword: "Nytt lösenord",
    confirmPassword: "Bekräfta lösenord",
    updatePassword: "Uppdatera lösenord",
    updating: "Uppdaterar...",
    passwordTooShort: "Lösenordet är för kort",
    passwordTooShortDesc: "Måste vara minst 6 tecken.",
    passwordsDontMatch: "Lösenorden matchar inte",
    passwordUpdated: "Lösenord uppdaterat!",
    error: "Fel",

    notificationPreferences: "Aviseringsinställningar",
    friendRequests: "Vill vara med i din vardag",
    gatheringInvites: "Träffinbjudningar",
    newLifeUpdates: "Nya uppdateringar från din krets",

    language: "Språk",
    english: "English",
    swedish: "Svenska",

    howWeUseData: "Hur vi använder din data",
    dataPrivacy1: "Dina livsuppdateringar delas bara med personer du uttryckligen gett tillgång till, baserat på nivån du tilldelat dem (Nära, Inre, Yttre).",
    dataPrivacy2: "Vi säljer aldrig dina personuppgifter eller delar dem med tredje part. Ditt innehåll stannar mellan dig och din krets.",
    dataPrivacy3: "Du kan radera ditt konto och all tillhörande data när som helst genom att kontakta oss.",

    logOut: "Logga ut",
    signedInAs: "Inloggad som",

    // Feed
    loadingFeed: "Laddar ditt flöde...",
    noUpdates: "Inga uppdateringar ännu",
    noUpdatesFilter: "Inga uppdateringar för detta filter",
    addFriendsHint: "Bjud in någon till din krets och tilldela åtkomstnivåer för att se deras livsuppdateringar här",
    all: "Alla",
    posts: "Inlägg",
    workouts: "Träning",
    period: "Mens",
    plans: "Planer",
    someone: "Någon",
    group: "Grupp",
    plan: "Plan",

    // Profile
    profileTitle: "Min sida",
    sections: "Sektioner",
    noSectionsYet: "Inga sektioner ännu",
    addFirstSection: "Lägg till din första livssektion",
    nothingSharedYet: "Inget delat ännu",
    shareLifeHint: "Dela dina barn, träning, graviditet, hobbyer & mer",
    lifeUpdates: "Livsuppdateringar",
    accessLevels: "Åtkomstnivåer på dina sektioner",
    close: "Nära",
    innerCircle: "Inre cirkel",
    everyone: "Alla",
    loading: "Laddar...",
    anonymous: "Anonym",
    addQuoteOrBio: "Lägg till en bio eller citat...",

    // Friends page
    searchFriends: "Sök vänner...",
    noFriendsYet: "Inga vänner ännu",
    noMatches: "Inga träffar",
    joinCirclesHint: "Gå med i cirklar för att hitta vänner",
    setTier: "Välj nivå...",
    couldNotUpdateTier: "Kunde inte uppdatera nivå",
    updated: "Uppdaterat!",

    // Notifications page
    markAllRead: "Markera alla som lästa",
    noNotificationsYet: "Inga aviseringar ännu",
    notificationsHint: "Du ser träffinbjudningar, kretsförfrågningar och uppdateringar här",

    // Auth page
    joinMinby: "Gå med i MINBY",
    welcomeBack: "Logga in",
    startPlanning: "Börja planera riktiga stunder med dina nära",
    yourFriendsWaiting: "Logga in för att fortsätta",
    yourName: "Ditt namn",
    howFriendsKnowYou: "Vad din krets kallar dig",
    email: "E-post",
    password: "Lösenord",
    createAccount: "Skapa konto",
    signIn: "Logga in",
    alreadyHaveAccount: "Har du redan ett konto?",
    dontHaveAccount: "Har du inget konto?",
    signUp: "Registrera dig",
    checkEmail: "Kolla din e-post för att bekräfta ditt konto!",

    // Share sheet
    shareNew: "Dela något nytt",
    lifeUpdate: "Livsuppdatering",
    shareWithCircles: "Dela med dina cirklar",
    suggestMeeting: "Föreslå träff",
    gatherFriends: "Samla din krets",
    section: "Sektion",
    chooseSection: "Välj en livssektion",
    whatsNew: "Vad händer i din vardag?",
    shareUpdatePlaceholder: "Skriv något…",
    back: "Tillbaka",
    couldntPost: "Kunde inte publicera",
    updateShared: "Uppdatering delad!",
    chooseGroup: "Välj en grupp",
    emoji: "Emoji",
    whatsThePlan: "Vad är planen?",
    when: "När?",
    whereOptional: "Var? (valfritt)",
    vibe: "Stämning",
    vibeChill: "Lugn",
    vibeAdventure: "Äventyr",
    vibeCreative: "Kreativ",
    vibeSelfcare: "Egenvård",
    suggest: "Föreslå",
    couldntCreateSuggestion: "Kunde inte skapa förslag",
    meetingSuggested: "Träff föreslagen!",

    // Create group dialog
    newGroup: "Ny grupp",
    createFriendGroup: "Skapa en vängrupp",
    pickEmoji: "Välj en emoji",
    groupName: "Gruppnamn",
    groupNamePlaceholder: "Bästisar, Jobbgänget, Grannar...",
    createGroup: "Skapa grupp",
    couldntCreateGroup: "Kunde inte skapa grupp",
    groupCreated: "Grupp skapad!",

    // Create plan dialog
    newPlan: "Ny plan",
    whatFeelLikeDoing: "Vad vill du göra?",
    planTitlePlaceholder: "Biokvall, målarkväll, vin & snack...",
    planDatePlaceholder: "11 mars, Sista helgen i juni...",
    planLocationPlaceholder: "Hemma hos mig, stan, parken...",
    shareWithGroup: "Dela med gruppen",
    couldntCreatePlan: "Kunde inte skapa plan",
    planShared: "Plan delad!",

    // Create section dialog
    addSection: "Lägg till sektion",
    addLifeSection: "Lägg till en livssektion",
    name: "Namn",
    sectionNamePlaceholder: "t.ex. Min trädgård",
    whoCanSee: "Vem kan se detta?",
    closeFriendsOnly: "Bara närmaste krets",
    innerCircleCloser: "Inre cirkel & närmare",
    allFriends: "Hela kretsen",
    creating: "Skapar...",
    createSection: "Skapa sektion",
    couldNotCreateSection: "Kunde inte skapa sektion",

    // Friend tier manager
    joinGroupsFirst: "Gå med i grupper först för att hantera åtkomstnivåer",
    friendAccessTiers: "Åtkomstnivåer för vänner",

    // Workout tracker
    logWorkout: "Logga träning",
    durationMinutes: "Längd (minuter)",
    saveWorkout: "Spara träning",
    couldNotLogWorkout: "Kunde inte logga träning",
    workoutLogged: "Träning loggad!",
    thisWeek: "denna vecka",

    // Period tracker
    logToday: "Logga idag",
    flowLevel: "Flödesnivå",
    flowLight: "Lätt",
    flowMedium: "Medel",
    flowHeavy: "Kraftigt",
    symptoms: "Symptom",
    symptomCramps: "Kramper",
    symptomHeadache: "Huvudvärk",
    symptomFatigue: "Trötthet",
    symptomBloating: "Uppsvälld",
    symptomMoodSwings: "Humörsvängningar",
    symptomBackPain: "Ryggvärk",
    saveEntry: "Spara",
    couldNotLog: "Kunde inte logga",
    logged: "Loggat!",
    dayOfCycle: "Dag {0} av cykeln",

    // Life section card
    tierClose: "Nära",
    tierInner: "Inre",
    tierAll: "Alla",
    closeOnly: "Bara nära",
    innerPlus: "Inre+",
    photo: "Bild",
    pasteLink: "Klistra in en länk...",
    noUpdatesYet: "Inga uppdateringar ännu",
    couldNotPost: "Kunde inte publicera",
    couldNotUpdateSection: "Kunde inte uppdatera sektion",
    sectionUpdated: "Sektion uppdaterad",
    hangoutAvailability: "Jag vill ses!",
    addAvailability: "Lägg till ett datum",
    selectDate: "Välj ett datum",
    activities: "Aktiviteter",
    activityNature: "Natur",
    activityFoodOut: "Äta ute",
    activityRelax: "Hänga",
    activityShopping: "Shopping",
    activitySports: "Sport",
    activityCoffee: "Fika",
    activityMovies: "Bio",
    activityGames: "Spel",
    customNote: "T.ex. fika, promenad, middag...",
    save: "Spara",
    noAvailability: "Inga datum markerade ännu",
    availabilitySaved: "Tillgänglighet sparad!",
    couldNotSaveAvailability: "Kunde inte spara tillgänglighet",
    availabilityRemoved: "Borttagen",
    couldNotRemoveAvailability: "Kunde inte ta bort",
    freeDates: "Hitta på något",
    shareWhenFree: "Visa vänner när du vill hitta på något",
    editAvailability: "Redigera",
    comments: "Kommentarer",
    addComment: "Skriv en kommentar...",
    shareProfile: "Dela profil",
    addFriend: "Lägg till i min krets",
    friendsStatus: "I din krets",
    requestPending: "Väntar",
    requestSent: "Skickat!",
    accept: "Ja, gärna",
    couldNotSendRequest: "Kunde inte skicka förfrågan",
    friendRequestReceived: "Vill vara med",
    wantsToBeYourFriend: "vill vara med i din vardag",
    friendRequestAccepted: "Nu i din krets!",
    acceptedYourRequest: "är nu en del av din vardag",
    friendAdded: "Tillagd i din krets!",
    hangoutSuggestions: "Hangout-matchningar",
    reorderSections: "Ordna om",

    // Tips & Favorites
    tipsSectionTitle: "Tips & favoriter",
    addTip: "Lägg till tips",
    tipTitlePlaceholder: "Vad rekommenderar du?",
    tipUrlPlaceholder: "Länk (valfritt)",
    tipAddImage: "Lägg till bild",
    tipImageChanged: "Bild tillagd",
    tipLimitReached: "Max antal nått",
    tipLimitDesc: "Du kan ha max 5 favoriter åt gången. Ta bort en först.",
    tipCountInfo: "{0} av {1} tips",
    tipEmptyTitle: "Dela dina bästa tips",
    tipEmptyDesc: "Hudvård, restauranger, poddar, böcker...",
    tipCat_skincare: "Hudvård",
    tipCat_food: "Mat & dryck",
    tipCat_podcast: "Podd",
    tipCat_book: "Bok",
    tipCat_show: "Serie/film",
    tipCat_salon: "Salong",
    tipCat_workout: "Träning",
    tipCat_product: "Produkt",
    tipCat_other: "Övrigt",
    tipFetchingPreview: "Hämtar förhandsgranskning...",
    tipPreviewFound: "Förhandsvisningsbild från länk",
    tipCommentPlaceholder: "Din kommentar om detta tips",
    tipEdit: "Redigera",
    tipDelete: "Ta bort",
    tipSave: "Spara ändringar",

    // Hangout sections
    hangoutAvailable: "Ledig",
    hangoutConfirmed: "Bekräftad träff",
    hangoutConfirmedLabel: "Planerade träffar",
    hangoutAvailableLabel: "Ledig & vill ses",
    hangoutNoConfirmed: "Inga bekräftade träffar än",
    hangoutNoAvailable: "Inga lediga datum än",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, ...args: (string | number)[]) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("minby-lang");
    return (stored === "en" ? "en" : "sv") as Lang;
  });

  const [dbOverrides, setDbOverrides] = useState<Record<string, Record<string, string>>>({});

  // Fetch DB translation overrides
  useEffect(() => {
    const fetchOverrides = async () => {
      const { data } = await supabase
        .from("app_translations")
        .select("key, lang, value");
      if (data && data.length > 0) {
        const map: Record<string, Record<string, string>> = {};
        data.forEach((row: { key: string; lang: string; value: string }) => {
          if (!map[row.lang]) map[row.lang] = {};
          map[row.lang][row.key] = row.value;
        });
        setDbOverrides(map);
      }
    };
    fetchOverrides();
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("minby-lang", l);
  };

  const t = (key: TranslationKey, ...args: (string | number)[]): string => {
    // DB override takes priority, then hardcoded, then key
    let str: string =
      dbOverrides[lang]?.[key] ||
      translations[lang][key] ||
      dbOverrides["en"]?.[key] ||
      translations.en[key] ||
      key;
    args.forEach((arg, i) => {
      str = str.replace(`{${i}}`, String(arg));
    });
    return str;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
