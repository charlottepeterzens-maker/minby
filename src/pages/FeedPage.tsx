import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Link as LinkIcon, CalendarDays, MapPin, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
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

const sectionTypeFilters = [
  { label: "All", value: "all" },
  { label: "Posts", value: "posts" },
  { label: "Workouts", value: "workout" },
  { label: "Period", value: "period" },
  { label: "Plans", value: "plans" },
];

const FeedPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [plans, setPlans] = useState<FeedPlan[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

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

  const getProfile = (userId: string) => profiles[userId] || { display_name: "Someone", avatar_url: null };
  const getInitial = (name: string | null) => name?.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-display text-xl font-normal tracking-[0.35em] text-foreground">MINBY</span>
          <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {sectionTypeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1 text-xs font-medium border whitespace-nowrap transition-all ${
                filter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading your feed...</div>
        ) : feedItems.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <p className="font-display text-lg text-muted-foreground">
              {filter === "all" ? "No updates yet" : "No updates for this filter"}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Add friends and assign them access tiers to see their life updates here
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {feedItems.map((item, i) => (
              <motion.div
                key={`${item.type}-${item.data.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
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
              </motion.div>
            ))}
          </div>
        )}
      </main>
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
    <Card className="border-border/50 shadow-card overflow-hidden">
      <CardContent className="p-4">
        <button onClick={onProfileClick} className="flex items-center gap-2 mb-3 group">
          <Avatar className="w-8 h-8 border border-primary/30">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || "User"} />
            <AvatarFallback className="bg-primary/10 text-xs font-display font-bold text-primary">
              {getInitial(profile.display_name)}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {profile.display_name || "Someone"}
            </p>
            {section && <p className="text-[11px] text-muted-foreground">{section.emoji} {section.name}</p>}
          </div>
        </button>
        {post.image_url && <img src={post.image_url} alt="" className="w-full mb-3 max-h-80 object-cover" />}
        {post.content && <p className="text-sm text-foreground mb-2">{post.content}</p>}
        {post.link_url && (
          <a href={post.link_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
            <LinkIcon className="w-3 h-3" /> {post.link_url.slice(0, 50)}
          </a>
        )}
        <p className="text-[11px] text-muted-foreground/50 mt-2">{new Date(post.created_at).toLocaleDateString()}</p>
      </CardContent>
    </Card>
  );
};

const PlanFeedCard = ({ plan }: { plan: FeedPlan }) => (
  <Card className="border-primary/20 bg-primary/5 shadow-card overflow-hidden">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 flex items-center justify-center shrink-0">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-primary font-medium mb-0.5">{plan.friend_groups?.name || "Group"} · Plan</p>
          <p className="font-display font-semibold text-foreground">{plan.title}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {plan.date_text}</span>
            {plan.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {plan.location}</span>}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground/50 mt-2">{new Date(plan.created_at).toLocaleDateString()}</p>
    </CardContent>
  </Card>
);

export default FeedPage;
