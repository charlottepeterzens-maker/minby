import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

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
    friendRequests: "Friend requests",
    gatheringInvites: "Gathering invites",
    newLifeUpdates: "New life updates from friends",

    language: "Language",
    english: "English",
    swedish: "Svenska",

    howWeUseData: "How we use your data",
    dataPrivacy1: "Your life updates are only shared with friends you've explicitly granted access to, based on the tier you assign them (Close, Inner, Outer).",
    dataPrivacy2: "We never sell your personal data or share it with third parties. Your content stays between you and your circles.",
    dataPrivacy3: "You can delete your account and all associated data at any time by contacting us.",

    logOut: "Log out",
    signedInAs: "Signed in as",

    // Feed
    loadingFeed: "Loading your feed...",
    noUpdates: "No updates yet",
    noUpdatesFilter: "No updates for this filter",
    addFriendsHint: "Add friends and assign them access tiers to see their life updates here",
    all: "All",
    posts: "Posts",
    workouts: "Workouts",
    period: "Period",
    plans: "Plans",

    // Profile
    profileTitle: "Profile",
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
  },
  sv: {
    // Nav
    home: "Hem",
    friends: "Vänner",
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
    friendRequests: "Vänförfrågningar",
    gatheringInvites: "Träffinbjudningar",
    newLifeUpdates: "Nya uppdateringar från vänner",

    language: "Språk",
    english: "English",
    swedish: "Svenska",

    howWeUseData: "Hur vi använder din data",
    dataPrivacy1: "Dina livsuppdateringar delas bara med vänner du uttryckligen gett tillgång till, baserat på nivån du tilldelat dem (Nära, Inre, Yttre).",
    dataPrivacy2: "Vi säljer aldrig dina personuppgifter eller delar dem med tredje part. Ditt innehåll stannar mellan dig och dina cirklar.",
    dataPrivacy3: "Du kan radera ditt konto och all tillhörande data när som helst genom att kontakta oss.",

    logOut: "Logga ut",
    signedInAs: "Inloggad som",

    // Feed
    loadingFeed: "Laddar ditt flöde...",
    noUpdates: "Inga uppdateringar ännu",
    noUpdatesFilter: "Inga uppdateringar för detta filter",
    addFriendsHint: "Lägg till vänner och tilldela dem åtkomstnivåer för att se deras livsuppdateringar här",
    all: "Alla",
    posts: "Inlägg",
    workouts: "Träning",
    period: "Mens",
    plans: "Planer",

    // Profile
    profileTitle: "Profil",
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
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
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
    return (stored === "sv" ? "sv" : "en") as Lang;
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("minby-lang", l);
  };

  const t = (key: TranslationKey): string => {
    return translations[lang][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
