import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import CurvedSeparator from "@/components/CurvedSeparator";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import FeedPostCard from "@/components/feed/FeedPostCard";
import FeedHangoutCard from "@/components/feed/FeedHangoutCard";
import FeedHealthCard from "@/components/feed/FeedHealthCard";
import AddHangoutSheet from "@/components/profile/AddHangoutSheet";
import InviteFriendDialog from "@/components/profile/InviteFriendDialog";
import FirstTimeOverlay from "@/components/onboarding/FirstTimeOverlay";
import FeedGuidanceCard from "@/components/onboarding/FeedGuidanceCard";
import ReconnectNudge from "@/components/feed/ReconnectNudge";
import CloseCircleSuggestion from "@/components/feed/CloseCircleSuggestion";
import { useFirstTimeUser } from "@/hooks/useFirstTimeUser";
import { toast } from "sonner";

interface ProfileMap {
  [userId: string]: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

type FeedItem =
  | { type: "post"; data: any; userId: string; created_at: string }
  | { type: "hangout"; data: any; userId: string; created_at: string }
  | { type: "activity_group"; data: any; userId: string; created_at: string }
  | { type: "health"; data: any; userId: string; created_at: string };

const FeedPage = () => {
  const [suggestData, setSuggestData] = useState<{
    postId: string;
    content: string | null;
    userName: string;
  } | null>(null);
  const [showHangoutSheet, setShowHangoutSheet] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isFirstTime, dismiss: dismissOnboarding } = useFirstTimeUser();
  const [showOverlay, setShowOverlay] = useState(true);
  const [inviteCompleted, setInviteCompleted] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [closeCircleIds, setCloseCircleIds] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Close circle suggestion state
  const [suggestionTarget, setSuggestionTarget] = useState<{ userId: string; name: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch profile + close circle tiers in parallel
    Promise.all([
      supabase.from("profiles").select("display_name, muted_users").eq("user_id", user.id).single(),
      supabase.from("friend_access_tiers").select("friend_user_id, tier").eq("owner_id", user.id),
    ]).then(([profileRes, tiersRes]) => {
      if (profileRes.data?.display_name) setCurrentUserName(profileRes.data.display_name);
      if (profileRes.data?.muted_users) setMutedUsers((profileRes.data.muted_users as any) || []);

      const closeIds = new Set<string>();
      const allFriendIds: string[] = [];
      tiersRes.data?.forEach((t) => {
        allFriendIds.push(t.friend_user_id);
        if (t.tier === "close") closeIds.add(t.friend_user_id);
      });
      setCloseCircleIds(closeIds);
      setFriendIds(allFriendIds);
    });
  }, [user]);

  const filters = [
    { label: "Allt", value: "all" },
    { label: "Vardagen", value: "posts" },
    { label: "Ses vi", value: "hangout" },
    { label: "Hälsa", value: "health" },
  ];

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [postsRes, hangoutsRes] = await Promise.all([
      supabase
        .from("life_posts")
        .select(
          "id, content, image_url, link_url, created_at, section_id, user_id, photo_layout, life_sections(name, emoji, section_type, min_tier, user_id)",
        )
        .order("created_at", { ascending: false })
        .limit(50),

      supabase
        .from("hangout_availability")
        .select("id, date, activities, custom_note, created_at, user_id, entry_type, visibility")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const posts = postsRes.data || [];
    const hangouts = hangoutsRes.data || [];
    const items: FeedItem[] = [];

    posts.forEach((p: any) => {
      const section = p.life_sections;
      const sectionType = section?.section_type || "posts";

      if (sectionType === "period") {
        items.push({
          type: "health",
          data: {
            id: p.id,
            content: p.content,
            created_at: p.created_at,
            sectionName: section?.name || "Hälsa",
          },
          userId: p.user_id,
          created_at: p.created_at,
        });
      } else {
        items.push({
          type: "post",
          data: {
            id: p.id,
            content: p.content,
            image_url: p.image_url,
            link_url: p.link_url,
            created_at: p.created_at,
            sectionName: section?.name || "Uppdatering",
            sectionType,
            photo_layout: (p as any).photo_layout || "large",
          },
          userId: p.user_id,
          created_at: p.created_at,
        });
      }
    });

    // Group activity hangouts by user + activity name
    const activityGroups = new Map<
      string,
      {
        ids: string[];
        dates: string[];
        activities: string[];
        custom_note: string | null;
        created_at: string;
        user_id: string;
      }
    >();

    hangouts.forEach((h: any) => {
      if (h.visibility === "private" && h.user_id !== user.id) return;

      if (h.entry_type === "activity") {
        const activityName = h.activities?.[0] || h.custom_note || "Aktivitet";
        const groupKey = `${h.user_id}::${activityName}`;
        const existing = activityGroups.get(groupKey);
        if (existing) {
          existing.ids.push(h.id);
          if (!existing.dates.includes(h.date)) existing.dates.push(h.date);
          if (new Date(h.created_at) < new Date(existing.created_at)) {
            existing.created_at = h.created_at;
          }
        } else {
          activityGroups.set(groupKey, {
            ids: [h.id],
            dates: [h.date],
            activities: h.activities || [],
            custom_note: h.custom_note,
            created_at: h.created_at,
            user_id: h.user_id,
          });
        }
      } else {
        items.push({
          type: "hangout",
          data: {
            id: h.id,
            date: h.date,
            activities: h.activities || [],
            custom_note: h.custom_note,
            created_at: h.created_at,
            entry_type: h.entry_type,
          },
          userId: h.user_id,
          created_at: h.created_at,
        });
      }
    });

    activityGroups.forEach((group) => {
      group.dates.sort();
      items.push({
        type: "activity_group",
        data: {
          ids: group.ids,
          dates: group.dates,
          activities: group.activities,
          custom_note: group.custom_note,
          created_at: group.created_at,
          entry_type: "activity",
        },
        userId: group.user_id,
        created_at: group.created_at,
      });
    });

    // Sort: close circle posts first (each group chronological), then others
    const closeItems = items
      .filter((i) => closeCircleIds.has(i.userId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const otherItems = items
      .filter((i) => !closeCircleIds.has(i.userId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const sorted = [...closeItems, ...otherItems];

    const userIds = new Set<string>();
    sorted.forEach((item) => userIds.add(item.userId));

    if (userIds.size > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(userIds));

      if (profileData) {
        const map: ProfileMap = {};
        profileData.forEach((p) => {
          map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
        });
        setProfiles(map);
      }
    }

    setFeedItems(sorted);
    setLoading(false);
  }, [user, closeCircleIds]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Interaction boost: occasionally suggest adding to close circle
  const handleInteraction = useCallback(
    (userId: string, userName: string) => {
      if (closeCircleIds.has(userId)) return;
      if (userId === user?.id) return;

      // Show suggestion ~20% of the time, max once per session per user
      const key = `close_suggest_${userId}`;
      if (sessionStorage.getItem(key)) return;
      if (Math.random() > 0.2) return;

      sessionStorage.setItem(key, "1");
      setSuggestionTarget({ userId, name: userName });
    },
    [closeCircleIds, user],
  );

  const getProfile = (userId: string) => {
    const p = profiles[userId] || { display_name: null, avatar_url: null };
    const name = p.display_name || "Någon";

    const initials = name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return { ...p, initials };
  };

  const filteredItems = feedItems.filter((item) => {
    if (mutedUsers.includes(item.userId)) return false;
    if (filter === "all") return true;
    if (filter === "posts") return item.type === "post";
    if (filter === "hangout") return item.type === "hangout" || item.type === "activity_group";
    if (filter === "health") return item.type === "health";
    return true;
  });

  const handleSendHug = async (postId: string) => {
    if (!user) return;
    const { error } = await supabase.from("post_reactions").insert({
      post_id: postId,
      user_id: user.id,
      emoji: "🤗",
    });
    if (error) {
      toast.success("Kärlek skickad 💛");
    } else {
      toast.success("Du skickade en kram 🤗");
    }
  };

  const handleSuggestPlan = (data: { postId: string; content: string | null; userName: string }) => {
    setSuggestData(data);
    setShowHangoutSheet(true);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 10) return "God morgon";
    if (h < 12) return "God förmiddag";
    if (h < 17) return "God eftermiddag";
    if (h < 21) return "God kväll";
    return "God natt";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-50 bg-background">
        <div className="max-w-2xl mx-auto px-5 pt-5 pb-3">
          <h1 className="font-fraunces text-[20px] font-medium text-foreground">
            {getGreeting()}, {currentUserName || "du"}.
          </h1>
          {!loading &&
            feedItems.length > 0 &&
            (() => {
              const othersCount = feedItems.filter((i) => i.userId !== user?.id).length;
              return othersCount > 0 ? (
                <p className="text-[12px] mt-1" style={{ color: "#7A6A85" }}>
                  {othersCount} nya saker från din krets
                </p>
              ) : null;
            })()}
        </div>
        <CurvedSeparator />
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-5">
        {/* Hide filters for first-time users */}
        {!isFirstTime && (
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-1.5 text-xs font-medium rounded-[20px] ${
                  filter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground border border-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Guidance card after invite */}
        {(isFirstTime || inviteCompleted) && !showOverlay && <FeedGuidanceCard />}

        {/* Reconnect nudge */}
        {!loading && friendIds.length > 0 && <ReconnectNudge friendIds={friendIds} profiles={profiles} />}

        {/* Close circle suggestion */}
        {suggestionTarget && (
          <CloseCircleSuggestion
            friendUserId={suggestionTarget.userId}
            friendName={suggestionTarget.name}
            onDismiss={() => setSuggestionTarget(null)}
          />
        )}

        {/* Quiet feed nudge */}
        {!loading &&
          filteredItems.length > 0 &&
          (() => {
            const newest = filteredItems[0]?.created_at;
            const ownRecent = filteredItems.some(
              (i) => i.userId === user?.id && Date.now() - new Date(i.created_at).getTime() < 12 * 3600_000,
            );
            const isQuiet = newest && Date.now() - new Date(newest).getTime() > 48 * 3600_000 && !ownRecent;
            if (!isQuiet) return null;
            return (
              <button
                onClick={() => navigate("/profile")}
                className="w-full mb-4 text-left"
                style={{ backgroundColor: "#EDE8F4", borderRadius: "10px", padding: "10px 14px" }}
              >
                <span className="text-[12px] font-medium" style={{ color: "#3C2A4D" }}>
                  Vad händer hos dig idag?
                </span>
                <span className="text-[12px] ml-1.5" style={{ color: "#7A6A85" }}>
                  Dela något →
                </span>
              </button>
            );
          })()}

        {!loading && filteredItems.length === 0 ? (
          <EmptyFeedCard
            onOpenHangout={() => setShowHangoutSheet(true)}
            onOpenInvite={() => setShowInviteDialog(true)}
          />
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const profile = getProfile(item.userId);
              const isOwn = item.userId === user?.id;

              if (item.type === "post") {
                return (
                  <FeedPostCard
                    key={item.data.id}
                    post={item.data}
                    profile={profile}
                    isOwn={isOwn}
                    onProfileClick={() => {
                      navigate(`/profile/${item.userId}`);
                      if (!isOwn) handleInteraction(item.userId, profile.display_name || "Någon");
                    }}
                    onSuggestPlan={
                      !isOwn
                        ? () => {
                            handleInteraction(item.userId, profile.display_name || "Någon");
                            setSuggestData({
                              postId: item.data.id,
                              content: item.data.content,
                              userName: profile.display_name || "Någon",
                            });
                            setShowHangoutSheet(true);
                          }
                        : undefined
                    }
                  />
                );
              }

              if (item.type === "hangout") {
                return (
                  <FeedHangoutCard
                    key={item.data.id}
                    hangout={item.data}
                    profile={profile}
                    isOwn={isOwn}
                    onProfileClick={() => {
                      navigate(`/profile/${item.userId}`);
                      if (!isOwn) handleInteraction(item.userId, profile.display_name || "Någon");
                    }}
                  />
                );
              }

              if (item.type === "activity_group") {
                return (
                  <FeedHangoutCard
                    key={`ag-${item.data.ids[0]}`}
                    hangout={item.data}
                    profile={profile}
                    isOwn={isOwn}
                    onProfileClick={() => {
                      navigate(`/profile/${item.userId}`);
                      if (!isOwn) handleInteraction(item.userId, profile.display_name || "Någon");
                    }}
                  />
                );
              }

              if (item.type === "health") {
                return (
                  <FeedHealthCard
                    key={item.data.id}
                    post={item.data}
                    profile={profile}
                    isOwn={isOwn}
                    onProfileClick={() => {
                      navigate(`/profile/${item.userId}`);
                      if (!isOwn) handleInteraction(item.userId, profile.display_name || "Någon");
                    }}
                  />
                );
              }

              return null;
            })}
          </div>
        )}
      </main>

      <ScrollToTopButton />

      <AddHangoutSheet
        open={showHangoutSheet}
        onOpenChange={setShowHangoutSheet}
        onCreated={() => {
          setShowHangoutSheet(false);
          fetchFeed();
        }}
      />

      <BottomNav />

      {/* First-time onboarding overlay */}
      {isFirstTime && showOverlay && (
        <FirstTimeOverlay
          onComplete={() => {
            setShowOverlay(false);
            setInviteCompleted(true);
          }}
          onDismiss={() => {
            setShowOverlay(false);
            dismissOnboarding();
          }}
        />
      )}
    </div>
  );
};

/** Empty feed – guided action cards */
const EmptyFeedCard = ({ onOpenHangout, onOpenInvite }: { onOpenHangout: () => void; onOpenInvite: () => void }) => {
  const navigate = useNavigate();

  const cards = [
    {
      emoji: "☀️",
      bg: "#FCF0F3",
      title: "Vad hände i din dag?",
      desc: "Dela något",
      action: () => navigate("/profile"),
    },
    {
      emoji: "📅",
      bg: "#EAF2E8",
      title: "Föreslå en träff",
      desc: "Är du ledig snart? Säg till din krets",
      action: onOpenHangout,
    },
    {
      emoji: "👋",
      bg: "#EDE8F4",
      title: "Bjud in fler till din vardag",
      desc: "Ju fler som är med, desto mer händer",
      action: onOpenInvite,
    },
  ];

  return (
    <div>
      <h2 className="font-fraunces text-[18px] font-medium text-center mb-1" style={{ color: "#3C2A4D" }}>
        Din by är tyst just nu.
      </h2>
      <p className="font-light text-[14px] text-center mb-5" style={{ color: "#7A6A85" }}>
        Sätt igång – välj ett första steg:
      </p>

      <div className="space-y-3">
        {cards.map((c, i) => (
          <button
            key={i}
            onClick={c.action}
            className="w-full flex items-center gap-3 text-left"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #EDE8E0",
              borderRadius: 8,
              padding: "14px 16px",
            }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: c.bg }}
            >
              <span className="text-base">{c.emoji}</span>
            </div>
            <div>
              <p className="font-medium text-[14px]" style={{ color: "#3C2A4D" }}>
                {c.title}
              </p>
              <p className="font-light text-[12px]" style={{ color: "#7A6A85" }}>
                {c.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FeedPage;
