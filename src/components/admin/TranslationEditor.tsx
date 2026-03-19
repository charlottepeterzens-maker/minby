import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Save, Check, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// Hardcoded defaults from LanguageContext (source of truth for keys)
const defaultTranslations: Record<string, Record<string, string>> = {
  en: {
    home: "Home", friends: "Friends", share: "Share", notifications: "Notifications",
    profile: "Profile", settings: "Settings", changePassword: "Change password",
    newPassword: "New password", confirmPassword: "Confirm password",
    updatePassword: "Update password", updating: "Updating...",
    passwordTooShort: "Password too short", passwordTooShortDesc: "Must be at least 6 characters.",
    passwordsDontMatch: "Passwords don't match", passwordUpdated: "Password updated!",
    error: "Error", notificationPreferences: "Notification preferences",
    friendRequests: "Friend requests", gatheringInvites: "Gathering invites",
    newLifeUpdates: "New life updates from friends", language: "Language",
    english: "English", swedish: "Svenska", howWeUseData: "How we use your data",
    logOut: "Log out", signedInAs: "Signed in as",
    loadingFeed: "Loading your feed...", noUpdates: "No updates yet",
    noUpdatesFilter: "No updates for this filter",
    addFriendsHint: "Add friends and assign them access tiers to see their life updates here",
    all: "All", posts: "Posts", workouts: "Workouts", period: "Period", plans: "Plans",
    someone: "Someone", group: "Group", plan: "Plan",
    profileTitle: "Profile", sections: "Sections", noSectionsYet: "No sections yet",
    addFirstSection: "Add your first life section", nothingSharedYet: "Nothing shared yet",
    shareLifeHint: "Share your kids, workouts, pregnancy, hobbies & more",
    lifeUpdates: "Life updates", accessLevels: "Access levels on your sections",
    close: "Close", innerCircle: "Inner circle", everyone: "Everyone",
    loading: "Loading...", anonymous: "Anonymous", addQuoteOrBio: "Add a quote or bio...",
    searchFriends: "Search friends...", noFriendsYet: "No friends yet",
    noMatches: "No matches", joinCirclesHint: "Join circles to connect with friends",
    setTier: "Set tier...", couldNotUpdateTier: "Could not update tier", updated: "Updated!",
    markAllRead: "Mark all read", noNotificationsYet: "No notifications yet",
    notificationsHint: "You'll see gathering invites, friend requests, and updates here",
    joinMinby: "Join MINBY", welcomeBack: "Welcome back",
    startPlanning: "Start planning real moments with your people",
    yourFriendsWaiting: "Your friends are waiting", yourName: "Your name",
    howFriendsKnowYou: "How your friends know you", email: "Email", password: "Password",
    createAccount: "Create account", signIn: "Sign in",
    alreadyHaveAccount: "Already have an account?", dontHaveAccount: "Don't have an account?",
    signUp: "Sign up", checkEmail: "Check your email to confirm your account!",
    shareNew: "Share something new", lifeUpdate: "Life update",
    shareWithCircles: "Share with your circles", suggestMeeting: "Suggest meeting",
    gatherFriends: "Gather your friends", section: "Section",
    chooseSection: "Choose a life section", whatsNew: "What's new?",
    shareUpdatePlaceholder: "Share an update with your circles...", back: "Back",
    couldntPost: "Couldn't post update", updateShared: "Update shared!",
    chooseGroup: "Choose a group", emoji: "Emoji", whatsThePlan: "What's the plan?",
    when: "When?", whereOptional: "Where? (optional)", vibe: "Vibe",
    vibeChill: "Chill", vibeAdventure: "Adventure", vibeCreative: "Creative",
    vibeSelfcare: "Self-care", suggest: "Suggest",
    couldntCreateSuggestion: "Couldn't create suggestion", meetingSuggested: "Meeting suggested!",
    newGroup: "New group", createFriendGroup: "Create a friend group",
    pickEmoji: "Pick an emoji", groupName: "Group name",
    groupNamePlaceholder: "Besties, Work crew, Neighbors...", createGroup: "Create group",
    couldntCreateGroup: "Couldn't create group", groupCreated: "Group created!",
    newPlan: "New plan", whatFeelLikeDoing: "What do you feel like doing?",
    addSection: "Add section", addLifeSection: "Add a life section", name: "Name",
    sectionNamePlaceholder: "e.g. My garden", whoCanSee: "Who can see this?",
    closeFriendsOnly: "Close friends only", innerCircleCloser: "Inner circle & closer",
    allFriends: "All friends", creating: "Creating...", createSection: "Create section",
    couldNotCreateSection: "Could not create section",
    joinGroupsFirst: "Join groups first to manage friend access tiers",
    friendAccessTiers: "Friend access tiers",
    logWorkout: "Log workout", durationMinutes: "Duration (minutes)",
    saveWorkout: "Save workout", couldNotLogWorkout: "Could not log workout",
    workoutLogged: "Workout logged!", thisWeek: "this week",
    logToday: "Log today", flowLevel: "Flow level", flowLight: "Light",
    flowMedium: "Medium", flowHeavy: "Heavy", symptoms: "Symptoms",
    saveEntry: "Save entry", couldNotLog: "Could not log", logged: "Logged!",
    hangoutAvailability: "Hang out", addAvailability: "Add a date",
    selectDate: "Select a date", activities: "Activities",
    save: "Save", noAvailability: "No dates marked yet",
    freeDates: "Hang out", shareWhenFree: "Let friends know when you want to hang out",
    editAvailability: "Edit",
  },
  sv: {
    home: "Hem", friends: "Min krets", share: "Dela", notifications: "Aviseringar",
    profile: "Profil", settings: "Inställningar", changePassword: "Byt lösenord",
    newPassword: "Nytt lösenord", confirmPassword: "Bekräfta lösenord",
    updatePassword: "Uppdatera lösenord", updating: "Uppdaterar...",
    passwordTooShort: "Lösenordet är för kort", passwordTooShortDesc: "Måste vara minst 6 tecken.",
    passwordsDontMatch: "Lösenorden matchar inte", passwordUpdated: "Lösenord uppdaterat!",
    error: "Fel", notificationPreferences: "Aviseringsinställningar",
    friendRequests: "Vill vara med i din vardag", gatheringInvites: "Träffinbjudningar",
    newLifeUpdates: "Nya uppdateringar från din krets", language: "Språk",
    english: "English", swedish: "Svenska", howWeUseData: "Hur vi använder din data",
    logOut: "Logga ut", signedInAs: "Inloggad som",
    loadingFeed: "Laddar ditt flöde...", noUpdates: "Inga uppdateringar ännu",
    all: "Alla", posts: "Inlägg", workouts: "Träning", period: "Mens", plans: "Planer",
    profileTitle: "Profil", sections: "Sektioner",
    loading: "Laddar...", anonymous: "Anonym",
    searchFriends: "Sök i din krets...", noFriendsYet: "Ingen i din krets ännu",
    markAllRead: "Markera alla som lästa",
    joinMinby: "Gå med i MINBY", welcomeBack: "Välkommen tillbaka",
    signIn: "Logga in", signUp: "Registrera dig",
    shareNew: "Dela något nytt", back: "Tillbaka",
    save: "Spara", freeDates: "Hitta på något", editAvailability: "Redigera",
  },
};

const allKeys = Object.keys(defaultTranslations.en);
const LANGS = ["en", "sv"] as const;

type DbOverride = {
  id: string;
  key: string;
  lang: string;
  value: string;
};

const TranslationEditor = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});

  // Fetch DB overrides
  const { data: overrides = [] } = useQuery({
    queryKey: ["admin-translations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_translations")
        .select("*");
      if (error) throw error;
      return data as DbOverride[];
    },
  });

  // Index overrides by `key:lang`
  const overrideMap = useMemo(() => {
    const map: Record<string, string> = {};
    overrides.forEach((o) => {
      map[`${o.key}:${o.lang}`] = o.value;
    });
    return map;
  }, [overrides]);

  const filteredKeys = useMemo(() => {
    if (!search.trim()) return allKeys;
    const q = search.toLowerCase();
    return allKeys.filter(
      (k) =>
        k.toLowerCase().includes(q) ||
        (defaultTranslations.en[k] || "").toLowerCase().includes(q) ||
        (defaultTranslations.sv[k] || "").toLowerCase().includes(q)
    );
  }, [search]);

  const editKey = (key: string, lang: string, value: string) => {
    setEdits((prev) => ({ ...prev, [`${key}:${lang}`]: value }));
  };

  const getValue = (key: string, lang: string) => {
    const editId = `${key}:${lang}`;
    if (editId in edits) return edits[editId];
    if (editId in overrideMap) return overrideMap[editId];
    return defaultTranslations[lang]?.[key] || "";
  };

  const isModified = (key: string, lang: string) => {
    const editId = `${key}:${lang}`;
    return editId in edits;
  };

  const hasOverride = (key: string, lang: string) => {
    return `${key}:${lang}` in overrideMap;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(edits);
      if (entries.length === 0) return;

      for (const [composite, value] of entries) {
        const [key, lang] = composite.split(":");
        const { error } = await supabase
          .from("app_translations")
          .upsert(
            { key, lang, value, updated_by: user?.id },
            { onConflict: "key,lang" }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ["admin-translations"] });
      queryClient.invalidateQueries({ queryKey: ["app-translations"] });
      toast({ title: "Saved!", description: `${Object.keys(edits).length} translations updated.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save translations.", variant: "destructive" });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (composite: string) => {
      const [key, lang] = composite.split(":");
      const { error } = await supabase
        .from("app_translations")
        .delete()
        .eq("key", key)
        .eq("lang", lang);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-translations"] });
      queryClient.invalidateQueries({ queryKey: ["app-translations"] });
      toast({ title: "Reset to default" });
    },
  });

  const pendingCount = Object.keys(edits).length;

  return (
    <div className="space-y-4">
      {/* Search + Save bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search keys or values..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={pendingCount === 0 || saveMutation.isPending}
          size="sm"
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          Save {pendingCount > 0 && `(${pendingCount})`}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {filteredKeys.length} keys · Edit values below. Changes are saved to the database and override defaults.
      </p>

      {/* Translation rows */}
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filteredKeys.map((key) => (
          <div
            key={key}
            className="rounded-lg border border-border bg-card p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {key}
              </code>
            </div>

            {LANGS.map((lang) => (
              <div key={lang} className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] w-8 justify-center shrink-0">
                  {lang.toUpperCase()}
                </Badge>
                <Input
                  value={getValue(key, lang)}
                  onChange={(e) => editKey(key, lang, e.target.value)}
                  className={`text-sm h-8 ${isModified(key, lang) ? "ring-1 ring-primary" : ""}`}
                />
                {hasOverride(key, lang) && !isModified(key, lang) && (
                  <button
                    onClick={() => resetMutation.mutate(`${key}:${lang}`)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Reset to default"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                {hasOverride(key, lang) && !isModified(key, lang) && (
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranslationEditor;
