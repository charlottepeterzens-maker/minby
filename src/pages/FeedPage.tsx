import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import FeedPostCard from "@/components/feed/FeedPostCard";
import FeedHangoutCard from "@/components/feed/FeedHangoutCard";
import FeedHealthCard from "@/components/feed/FeedHealthCard";
import { toast } from "sonner";

interface ProfileMap {
  [userId: string]: { display_name: string | null; avatar_url: string | null };
}

type FeedItem =
  | { type: "post"; data: any; userId: string; created_at: string }
  | { type: "hangout"; data: any; userId: string; created_at: string }
  | { type: "health"; data: any; userId: string; created_at: string };

const FeedPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const filters = [
    { label: t("all"), value: "all" },
    { label: t("posts"), value: "posts" },
    { label: "Dejter", value: "hangout" },
    { label: "Hälsa", value: "health" },
  ];

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [postsRes, hangoutsRes] = await Promise.all([
      supabase
        .from("life_posts")
        .select("id, content, image_url, link_url, created_at, section_id, user_id, life_sections(name, emoji, section_type, min_tier, user_id)")
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("hangout_availability")
        .select("id, date, activities, custom_note, created_at, user_id")
        .neq("user_id", user.id)
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
          },
          userId: p.user_id,
          created_at: p.created_at,
        });
      }
    });

    hangouts.forEach((h: any) => {
      items.push({
        type: "hangout",
        data: {
          id: h.id,
          date: h.date,
          activities: h.activities || [],
          custom_note: h.custom_note,
          created_at: h.created_at,
        },
        userId: h.user_id,
        created_at: h.created_at,
      });
    });

    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Fetch profiles
    const userIds = new Set<string>();
    items.forEach((item) => userIds.add(item.userId));

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

    setFeedItems(items);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

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
    if (filter === "all") return true;
    if (filter === "posts") return item.type === "post";
    if (filter === "hangout") return item.type === "hangout";
    if (filter === "health") return item.type === "health";
    return true;
  });

  const handleSendHug = (userId: string) => {
    toast.success("Kram skickad! 💛");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-background border-b-[0.5px] border-border">
        <div className="max-w-2xl mx-auto px-5 py-4 text-center">
          <span className="font-display text-[22px] tracking-[0.35em] text-foreground lowercase">
            minby
          </span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-5">
        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 text-xs font-medium rounded-[20px] whitespace-nowrap transition-colors duration-150 ${
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border-[0.5px] border-border hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-[14px] border-[0.5px] border-border h-36 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-lg text-muted-foreground">
              {filter === "all" ? t("noUpdates") : t("noUpdatesFilter")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t("addFriendsHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const profile = getProfile(item.userId);
              const key = `${item.type}-${item.data.id}`;

              if (item.type === "post") {
                return (
                  <FeedPostCard
                    key={key}
                    post={item.data}
                    profile={profile}
                    onProfileClick={() => navigate(`/profile/${item.userId}`)}
                  />
                );
              }

              if (item.type === "hangout") {
                return (
                  <FeedHangoutCard
                    key={key}
                    hangout={item.data}
                    profile={profile}
                    onProfileClick={() => navigate(`/profile/${item.userId}`)}
                  />
                );
              }

              if (item.type === "health") {
                return (
                  <FeedHealthCard
                    key={key}
                    post={item.data}
                    profile={profile}
                    onProfileClick={() => navigate(`/profile/${item.userId}`)}
                    onSendHug={() => handleSendHug(item.userId)}
                  />
                );
              }

              return null;
            })}
          </div>
        )}
      </main>
      <ScrollToTopButton />
      <BottomNav />
    </div>
  );
};

export default FeedPage;
