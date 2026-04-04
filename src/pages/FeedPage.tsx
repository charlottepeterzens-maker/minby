import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import { UserPlus, PenLine, CalendarDays } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import CurvedSeparator from "@/components/CurvedSeparator";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import AddHangoutSheet from "@/components/profile/AddHangoutSheet";
import InviteFriendDialog from "@/components/profile/InviteFriendDialog";
import QuickPostCard from "@/components/profile/QuickPostCard";

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
  const [currentProfile, setCurrentProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [userSections, setUserSections] = useState<any[]>([]);
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
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentUserName(data.display_name || "");
          setCurrentProfile(data);
        }
      });
    supabase
      .from("life_sections")
      .select("id, name, emoji, min_tier")
      .eq("user_id", user.id)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setUserSections(data);
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

    const [profilesRes, postsRes, hangoutsRes, myHangoutsRes, tipsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", friendIdArr),
      supabase
        .from("life_posts")
        .select("id, content, image_url, created_at, user_id, photo_layout, section_id, life_sections(name)")
        .in("user_id", friendIdArr)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("hangout_availability")
        .select("id, user_id, date, activities, custom_note, created_at, entry_type")
        .in("user_id", friendIdArr)
        .gte("date", todayStr)
        .neq("visibility", "private")
        .order("date", { ascending: true }),
      // Current user's own hangout dates for matching
      supabase
        .from("hangout_availability")
        .select("date")
        .eq("user_id", user.id)
        .gte("date", todayStr),
      supabase
        .from("user_tips")
        .select("user_id, id, title, comment, category, url, created_at")
        .in("user_id", friendIdArr)
        .order("created_at", { ascending: false }),
    ]);

    // Build profile map
    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    profilesRes.data?.forEach((p) => profileMap.set(p.user_id, p));

    // Build set of current user's hangout dates for matching
    const myHangoutDates = new Set<string>();
    myHangoutsRes.data?.forEach((h: any) => myHangoutDates.add(h.date));

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
      const prof = profileMap.get(p.user_id);
      items.push({
        type: "posts",
        created_at: p.created_at,
        data: { ...p, display_name: prof?.display_name || null, avatar_url: prof?.avatar_url || null },
      });
    });

    // hangouts – group activity-type entries by user+activity to avoid duplicates
    const activityGroups = new Map<string, any[]>();
    hangoutsRes.data?.forEach((h: any) => {
      const prof = profileMap.get(h.user_id);
      const enriched = { ...h, isMatch: myHangoutDates.has(h.date), display_name: prof?.display_name || null, avatar_url: prof?.avatar_url || null };
      if (h.entry_type === "activity") {
        const key = `${h.user_id}::${(h.activities || [])[0] || h.custom_note || ""}`;
        const group = activityGroups.get(key) || [];
        group.push(enriched);
        activityGroups.set(key, group);
      } else {
        items.push({ type: "hangout", created_at: h.created_at, data: enriched });
      }
    });
    // For each activity group, emit a single grouped card
    activityGroups.forEach((entries) => {
      const first = entries[0];
      const dates = entries.map(e => e.date).sort();
      const ids = entries.map(e => e.id);
      items.push({
        type: "hangout",
        created_at: first.created_at,
        data: { ...first, dates, ids },
      });
    });

    // tips
    tipsRes.data?.forEach((t: any) => {
      items.push({
        type: "tips",
        created_at: t.created_at,
        data: {
          id: t.id,
          title: t.title,
          comment: t.comment,
          category: t.category,
          url: t.url,
          created_at: t.created_at,
          user_id: t.user_id,
          display_name: profileMap.get(t.user_id)?.display_name || null,
          avatar_url: profileMap.get(t.user_id)?.avatar_url || null,
        },
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
  
  // Filter content (för posts, hangouts, tips)
const filteredItems = feedItems.filter((item) => {
  if (filter === "posts") return item.type === "posts";
  if (filter === "hangout") return item.type === "hangout";
  if (filter === "tips") return item.type === "tips";
  return false;
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
    <PageTransition className="min-h-screen pb-20" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      <nav className="sticky top-0 z-50 pt-safe" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
        <Container className="pt-5 pb-2">
          <h1 className="font-fraunces text-[20px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
            {getGreeting()}, {currentUserName || "du"}.
          </h1>
          {!loading && (
            <p className="text-[12px] mt-1" style={{ color: "hsl(var(--color-text-secondary))" }}>
              {activeCount > 0
                ? `${activeCount} ${activeCount === 1 ? "person har" : "personer har"} delat något`
                : "Tyst i din by idag – kanske är det din tur?"}
            </p>
          )}
          {/* Filters — inside sticky nav */}
          {!isFirstTime && persons.length > 0 && (
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className="text-xs font-medium shrink-0"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 99,
                    backgroundColor: filter === f.value ? "#3C2A4D" : "transparent",
                    color: filter === f.value ? "#F7F3EF" : "#6B5C78",
                    border: filter === f.value ? "none" : "none",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </Container>
        <CurvedSeparator />
      </nav>

      <Container className="py-5">
        {/* Quick post card */}
        {!loading && persons.length > 0 && filter === "all" && (
          <div className="mb-3" style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 4px 0 rgba(0,0,0,0.04)" }}>
            <QuickPostCard
              profile={currentProfile}
              sections={userSections}
              onPosted={() => fetchFeed()}
              onSectionsChanged={() => {
                supabase
                  .from("life_sections")
                  .select("id, name, emoji, min_tier")
                  .eq("user_id", user!.id)
                  .order("sort_order")
                  .then(({ data }) => { if (data) setUserSections(data); });
              }}
            />
          </div>
        )}

        {/* Guidance card */}
        {(isFirstTime || inviteCompleted) && <FeedGuidanceCard />}

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
        <div className="flex-1 h-px" style={{ backgroundColor: "hsl(var(--color-border-subtle))" }} />
        <span className="text-[9px] shrink-0" style={{ color: "hsl(var(--color-text-faint))" }}>
          Inte hört av sig på ett tag
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: "hsl(var(--color-border-subtle))" }} />
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
    </PageTransition>
  );
};

const EmptyFeedCard = ({ onOpenHangout, onOpenInvite }: { onOpenHangout: () => void; onOpenInvite: () => void }) => {
  const navigate = useNavigate();
  const items = [
    { onClick: onOpenInvite, bg: "#EDE8F4", icon: UserPlus, title: "Bjud in din närmaste krets", sub: "De du faktiskt vill hålla nära", cta: "Bjud in →", delay: 0.45 },
    { onClick: () => navigate("/profile"), bg: "#FCF0F3", icon: PenLine, title: "Dela från din vardag", sub: "Berätta vad som händer hos dig", cta: "Dela →", delay: 0.55 },
    { onClick: onOpenHangout, bg: "#EAF2E8", icon: CalendarDays, title: "Föreslå en träff", sub: "Se när det passar att ses", cta: "Föreslå →", delay: 0.65 },
  ];

  return (
    <motion.div
      className="flex flex-col items-center pt-6 pb-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative mb-6" style={{ width: 140, height: 80 }}>
        {[
          { left: 0, top: 8, bg: "#EDE8F4", delay: 0.15 },
          { left: 40, top: 0, bg: "#FCF0F3", delay: 0.25 },
          { left: 80, top: 12, bg: "#EAF2E8", delay: 0.35 },
        ].map((c, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full flex items-center justify-center"
            style={{ left: c.left, top: c.top, width: 56, height: 56, backgroundColor: c.bg, zIndex: i }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: c.delay, type: "spring", stiffness: 260, damping: 20 }}
          >
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "rgba(60,42,77,0.1)" }} />
          </motion.div>
        ))}
      </div>

      <motion.h2
        className="font-fraunces text-[18px] font-medium text-center mb-1.5"
        style={{ color: "hsl(var(--color-text-primary))" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        Din by väntar på dig
      </motion.h2>
      <motion.p
        className="text-[13px] text-center mb-6 leading-relaxed"
        style={{ color: "hsl(var(--color-text-secondary))", maxWidth: 260 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        Bjud in dina närmaste, dela ett ögonblick från din vardag, eller föreslå en träff.
      </motion.p>

      <div className="w-full space-y-2.5">
        {items.map((item, i) => (
          <motion.button
            key={i}
            onClick={item.onClick}
            className="w-full flex items-center gap-3.5 rounded-lg p-4 text-left transition-all hover:shadow-sm"
            style={{ backgroundColor: "hsl(var(--color-surface-card))" }}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: item.delay, duration: 0.35, ease: "easeOut" }}
            whileTap={{ scale: 0.97 }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: item.bg }}>
              <item.icon className="w-5 h-5" style={{ color: "hsl(var(--color-text-primary))" }} strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>{item.title}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--color-text-muted))" }}>{item.sub}</p>
            </div>
            <span className="text-[11px] font-medium shrink-0" style={{ color: "#7A5AA6" }}>{item.cta}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default FeedPage;
