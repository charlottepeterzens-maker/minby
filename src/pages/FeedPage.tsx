import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Link as LinkIcon, CalendarDays, MapPin } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface FeedPost {
  id: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  created_at: string;
  section_id: string;
  user_id: string;
  life_sections: {
    name: string;
    emoji: string;
    section_type: string;
    min_tier: string;
    user_id: string;
  } | null;
}

interface FeedPlan {
  id: string;
  title: string;
  emoji: string;
  date_text: string;
  location: string | null;
  vibe: string;
  created_at: string;
  group_id: string;
  friend_groups: { name: string } | null;
}

interface ProfileMap {
  [userId: string]: { display_name: string | null; avatar_url: string | null };
}

type FeedItem =
  | { type: "post"; data: FeedPost; created_at: string }
  | { type: "plan"; data: FeedPlan; created_at: string };

const FeedPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [plans, setPlans] = useState<FeedPlan[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const sectionTypeFilters = [
    { label: t("all"), value: "all" },
    { label: t("posts"), value: "posts" },
    { label: t("workouts"), value: "workout" },
    { label: t("period"), value: "period" },
    { label: t("plans"), value: "plans" },
  ];

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: postData } = await supabase
      .from("life_posts")
      .select("id, content, image_url, link_url, created_at, section_id, user_id, life_sections(name, emoji, section_type, min_tier, user_id)")
      .neq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const { data: planData } = await supabase
      .from("plans")
      .select("id, title, emoji, date_text, location, vibe, created_at, group_id, friend_groups(name)")
      .order("created_at", { ascending: false })
      .limit(20);

    const fetchedPosts = (postData || []) as FeedPost[];
    const fetchedPlans = (planData || []) as FeedPlan[];

    setPosts(fetchedPosts);
    setPlans(fetchedPlans);

    const userIds = new Set<string>();
    fetchedPosts.forEach((p) => userIds.add(p.user_id));
    if (userIds.size > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(userIds));
      if (profileData) {
        const map: ProfileMap = {};
        profileData.forEach((p) => { map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
        setProfiles(map);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const feedItems: FeedItem[] = [];
  if (filter === "all" || filter === "plans") {
    plans.forEach((plan) => feedItems.push({ type: "plan", data: plan, created_at: plan.created_at }));
  }
  if (filter !== "plans") {
    posts
      .filter((p) => filter === "all" || p.life_sections?.section_type === filter)
      .forEach((post) => feedItems.push({ type: "post", data: post, created_at: post.created_at }));
  }
  feedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getProfile = (userId: string) => profiles[userId] || { display_name: t("someone"), avatar_url: null };
  const getInitial = (name: string | null) => name?.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <span className="font-display text-lg font-medium tracking-[0.35em] text-foreground">MINBY</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-5">
        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
          {sectionTypeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 text-xs font-medium rounded-[20px] whitespace-nowrap transition-colors duration-150 ${
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground border border-border hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-muted rounded-[14px] h-32 animate-pulse" />
            ))}
          </div>
        ) : feedItems.length === 0 ? (
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
            {feedItems.map((item) => (
              <div key={`${item.type}-${item.data.id}`}>
                {item.type === "post" ? (
                  <PostCard
                    post={item.data}
                    profile={getProfile(item.data.user_id)}
                    getInitial={getInitial}
                    onProfileClick={() => navigate(`/profile/${item.data.user_id}`)}
                  />
                ) : (
                  <PlanFeedCard plan={item.data} />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <ScrollToTopButton />
      <BottomNav />
    </div>
  );
};

const PostCard = ({
  post, profile, getInitial, onProfileClick,
}: {
  post: FeedPost;
  profile: { display_name: string | null; avatar_url: string | null };
  getInitial: (name: string | null) => string;
  onProfileClick: () => void;
}) => {
  const section = post.life_sections;
  return (
    <Card className="rounded-[14px] border-[0.5px] border-border overflow-hidden">
      <CardContent className="p-4">
        {/* Header: avatar + name + timestamp + category pill */}
        <div className="flex items-center gap-2.5 mb-3">
          <button onClick={onProfileClick} className="shrink-0">
            <Avatar className="w-8 h-8">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || "User"} />
              <AvatarFallback className="bg-primary text-secondary text-xs font-display">
                {getInitial(profile.display_name)}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="flex-1 min-w-0">
            <button onClick={onProfileClick} className="text-sm font-medium text-foreground hover:underline">
              {profile.display_name || "Someone"}
            </button>
            <p className="text-[11px] text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString()}
            </p>
          </div>
          {section && (
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-[20px] bg-lavender-bg text-secondary-foreground">
              {section.name}
            </span>
          )}
        </div>

        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full mb-3 max-h-80 object-cover rounded-lg" />
        )}
        {post.content && (
          <p className="text-[13px] text-foreground leading-[1.5] mb-2">{post.content}</p>
        )}
        {post.link_url && (
          <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
            <LinkIcon className="w-3 h-3" /> {post.link_url.slice(0, 50)}
          </a>
        )}
      </CardContent>
    </Card>
  );
};

const PlanFeedCard = ({ plan }: { plan: FeedPlan }) => {
  const { t } = useLanguage();
  return (
    <Card className="rounded-[14px] border-[0.5px] border-border bg-primary text-primary-foreground overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-secondary/30 rounded-lg flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-secondary font-medium mb-0.5">
              {plan.friend_groups?.name || t("group")} · {t("plan")}
            </p>
            <p className="font-display font-medium text-primary-foreground">{plan.title}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[20px] bg-secondary/30 text-secondary">
                <CalendarDays className="w-3 h-3" /> {plan.date_text}
              </span>
              {plan.location && (
                <span className="inline-flex items-center gap-1 text-[11px] text-secondary/80">
                  <MapPin className="w-3 h-3" /> {plan.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedPage;
