import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import CurvedSeparator from "@/components/CurvedSeparator";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import AddHangoutSheet from "@/components/profile/AddHangoutSheet";
import InviteFriendDialog from "@/components/profile/InviteFriendDialog";

import FeedGuidanceCard from "@/components/onboarding/FeedGuidanceCard";
import PersonBlock, { type PersonData } from "@/components/feed/PersonBlock";
import { Container } from "@/components/layout";
import { useFirstTimeUser } from "@/hooks/useFirstTimeUser";
import { ContentFeed } from "@/components/feed/ContentFeed";

const FeedPage = () => {
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFirstTime, dismiss: dismissOnboarding } = useFirstTimeUser();

  const [persons, setPersons] = useState<PersonData[]>([]);
  const [currentUserName, setCurrentUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showHangoutSheet, setShowHangoutSheet] = useState(false);

  const [inviteCompleted, setInviteCompleted] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Fetch current user's name
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setCurrentUserName(data.display_name);
      });
  }, [user]);

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // 1. Get all accepted friendships (both directions)
    const [sentRes, receivedRes] = await Promise.all([
      supabase.from("friend_requests").select("to_user_id").eq("from_user_id", user.id).eq("status", "accepted"),
      supabase.from("friend_requests").select("from_user_id").eq("to_user_id", user.id).eq("status", "accepted"),
    ]);

    const friendIds = new Set<string>();
    sentRes.data?.forEach((r) => friendIds.add(r.to_user_id));
    receivedRes.data?.forEach((r) => friendIds.add(r.from_user_id));

    if (friendIds.size === 0) {
      setPersons([]);
      setLoading(false);
      return;
    }

    const friendIdArr = Array.from(friendIds);

    // 2. Fetch all data in parallel
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const todayStr = new Date().toISOString().split("T")[0];

    const [profilesRes, postsRes, hangoutsRes, tipsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", friendIdArr),
      supabase
        .from("life_posts")
        .select("id, content, image_url, created_at, user_id, photo_layout, section_id, life_sections(name)")
        .in("user_id", friendIdArr)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("hangout_availability")
        .select("user_id, date, activities, custom_note, created_at")
        .in("user_id", friendIdArr)
        .gte("date", todayStr)
        .neq("visibility", "private")
        .order("date", { ascending: true }),
      supabase
        .from("user_tips")
        .select("user_id, title, created_at")
        .in("user_id", friendIdArr)
        .order("created_at", { ascending: false }),
    ]);

    // Build profile map
    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    profilesRes.data?.forEach((p) => profileMap.set(p.user_id, p));

    // Group posts by user
    const postsByUser = new Map<string, typeof postsRes.data>();
    postsRes.data?.forEach((p: any) => {
      const arr = postsByUser.get(p.user_id) || [];
      arr.push(p);
      postsByUser.set(p.user_id, arr);
    });

    // Group hangouts by user (first active one per user)
    const hangoutByUser = new Map<string, (typeof hangoutsRes.data)[0]>();
    hangoutsRes.data?.forEach((h: any) => {
      if (!hangoutByUser.has(h.user_id)) hangoutByUser.set(h.user_id, h);
    });

    // Group tips by user
    const tipByUser = new Map<string, (typeof tipsRes.data)[0]>();
    tipsRes.data?.forEach((t: any) => {
      if (!tipByUser.has(t.user_id)) tipByUser.set(t.user_id, t);
    });

    // 3. Build person data
    const personList: PersonData[] = friendIdArr.map((fid) => {
      const profile = profileMap.get(fid);
      const name = profile?.display_name || "Någon";
      const initials = name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      const posts = postsByUser.get(fid) || [];
      const latestPost = posts[0] || null;
      const recentPosts = posts.slice(0, 3).map((p: any) => ({
        id: p.id,
        content: p.content,
        image_url: p.image_url,
        created_at: p.created_at,
        sectionName: p.life_sections?.name || "",
        photo_layout: p.photo_layout || "large",
      }));

      const postCountLast7Days = posts.filter(
        (p: any) => new Date(p.created_at).getTime() > Date.now() - 7 * 86400000,
      ).length;

      const hangout = hangoutByUser.get(fid) || null;
      const tip = tipByUser.get(fid) || null;

      // Determine last activity
      const activityDates = [latestPost?.created_at, hangout?.created_at, tip?.created_at].filter(Boolean) as string[];
      const lastActivityAt =
        activityDates.length > 0
          ? activityDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          : new Date(0).toISOString();

      const isQuiet = Date.now() - new Date(lastActivityAt).getTime() > 7 * 86400000;

      return {
        userId: fid,
        displayName: name,
        avatarUrl: profile?.avatar_url || null,
        initials,
        latestPost: latestPost
          ? {
              id: latestPost.id,
              content: (latestPost as any).content,
              image_url: (latestPost as any).image_url,
              created_at: (latestPost as any).created_at,
              sectionName: (latestPost as any).life_sections?.name || "",
              photo_layout: (latestPost as any).photo_layout || "large",
            }
          : null,
        recentPosts,
        postCountLast7Days,
        activeHangout: hangout
          ? { date: hangout.date, activities: (hangout as any).activities || [], custom_note: hangout.custom_note }
          : null,
        latestTip: tip ? { title: tip.title } : null,
        lastActivityAt,
        isQuiet,
      };
    });

    // Sort by last activity
    personList.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

    setPersons(personList);
    const items: any[] = [];

    // posts
    postsRes.data?.forEach((p: any) => {
      items.push({
        type: "posts",
        created_at: p.created_at,
        data: p,
      });
    });

    // hangouts
    hangoutsRes.data?.forEach((h: any) => {
      items.push({
        type: "hangout",
        created_at: h.created_at,
        data: h,
      });
    });

    // tips
    tipsRes.data?.forEach((t: any) => {
      items.push({
        type: "tips",
        created_at: t.created_at,
        data: t,
      });
    });

    // sort latest first
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFeedItems(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Filter
  const filtered = persons.filter((p) => {
    if (filter === "all") return true;
    if (filter === "posts") return p.postCountLast7Days > 0;
    if (filter === "hangout") return !!p.activeHangout;
    if (filter === "tips") return !!p.latestTip;
    return true;
  });

  // Split into active and quiet for separator
  const activePersons = filtered.filter((p) => !p.isQuiet);
  const quietPersons = filtered.filter((p) => p.isQuiet);

  const activeCount = persons.filter((p) => !p.isQuiet).length;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 10) return "God morgon";
    if (h < 12) return "God förmiddag";
    if (h < 17) return "God eftermiddag";
    if (h < 21) return "God kväll";
    return "God natt";
  };

  const filters = [
    { label: "Alla", value: "all" },
    { label: "Vardag", value: "posts" },
    { label: "Ses vi?", value: "hangout" },
    { label: "Tips", value: "tips" },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: "#F7F3EF" }}>
      <nav className="sticky top-0 z-50" style={{ backgroundColor: "#F7F3EF" }}>
        <Container className="pt-5 pb-3">
          <h1 className="font-fraunces text-[20px] font-medium" style={{ color: "#2A1A3C" }}>
            {getGreeting()}, {currentUserName || "du"}.
          </h1>
          {!loading && (
            <p className="text-[12px] mt-1" style={{ color: "#7A6A85" }}>
              {activeCount > 0
                ? `${activeCount} ${activeCount === 1 ? "person har" : "personer har"} delat något`
                : "Tyst i din by idag – kanske är det din tur?"}
            </p>
          )}
        </Container>
        <CurvedSeparator />
      </nav>

      <Container className="py-5">
        {/* Guidance card */}
        {(isFirstTime || inviteCompleted) && <FeedGuidanceCard />}

        {/* Filters */}
        {!isFirstTime && persons.length > 0 && (
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="text-xs font-medium shrink-0"
                style={{
                  padding: "6px 14px",
                  borderRadius: 99,
                  backgroundColor: filter === f.value ? "#3C2A4D" : "transparent",
                  color: filter === f.value ? "#F7F3EF" : "#9B8BA5",
                  border: filter === f.value ? "none" : "1px solid #EDE8E0",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && persons.length === 0 ? (
          <EmptyFeedCard
            onOpenHangout={() => setShowHangoutSheet(true)}
            onOpenInvite={() => setShowInviteDialog(true)}
          />
   ) : filter === "all" ? (
  <div className="space-y-3">
    {activePersons.map((p) => (
      <PersonBlock key={p.userId} person={p} currentUserName={currentUserName} />
    ))}

    {/* Separator */}
    {quietPersons.length > 0 && activePersons.length > 0 && (
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px" style={{ backgroundColor: "#EDE8E0" }} />
        <span className="text-[9px] shrink-0" style={{ color: "#B0A0B5" }}>
          Inte hört av sig på ett tag
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: "#EDE8E0" }} />
      </div>
    )}

    {quietPersons.map((p) => (
      <PersonBlock key={p.userId} person={p} currentUserName={currentUserName} />
    ))}
  </div>
) : (
  <ContentFeed items={filteredItems} />
)}
      </Container>

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
    </div>
  );
};

const EmptyFeedCard = ({ onOpenHangout, onOpenInvite }: { onOpenHangout: () => void; onOpenInvite: () => void }) => {
  const navigate = useNavigate();

  const cards = [
    {
      bg: "#EDE8F4",
      title: "Bjud in din närmaste krets",
      desc: "De du faktiskt vill hålla nära – på ett lugnare ställe.",
      action: onOpenInvite,
      cta: "Skicka inbjudan",
    },
    {
      bg: "#FCF0F3",
      title: "Dela något från din vardag",
      desc: "Berätta vad som händer hos dig",
      action: () => navigate("/profile"),
      cta: "Dela något",
    },
    {
      bg: "#EAF2E8",
      title: "Föreslå en träff",
      desc: "Se när det passar att ses",
      action: onOpenHangout,
      cta: "Föreslå",
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
            <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: c.bg }} />
            <div>
              <p className="font-medium text-[14px]" style={{ color: "#3C2A4D" }}>
                {c.title}
              </p>
              <span className="text-[12px]" style={{ color: "#3C2A4D", marginTop: 4, display: "inline-block" }}>
                {c.cta} →
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FeedPage;
