import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

interface FriendWithTier {
  friend_user_id: string;
  display_name: string;
  avatar_url: string | null;
  initial: string;
  tier: string | null;
}

const tierLabels: Record<string, { label: string; badge: string }> = {
  close: { label: "Close", badge: "bg-primary/15 text-primary" },
  inner: { label: "Inner circle", badge: "bg-secondary/20 text-secondary-foreground" },
  outer: { label: "Everyone", badge: "bg-muted text-muted-foreground" },
};

const FriendsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendWithTier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", user.id);

    if (!memberships?.length) { setFriends([]); setLoading(false); return; }

    const groupIds = memberships.map((m) => m.group_id);
    const { data: allMembers } = await supabase
      .from("group_memberships")
      .select("user_id")
      .in("group_id", groupIds)
      .neq("user_id", user.id);

    if (!allMembers?.length) { setFriends([]); setLoading(false); return; }

    const uniqueIds = [...new Set(allMembers.map((m) => m.user_id))];

    const [{ data: profiles }, { data: tiers }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", uniqueIds),
      supabase.from("friend_access_tiers").select("friend_user_id, tier").eq("owner_id", user.id),
    ]);

    const tierMap = new Map(tiers?.map((t) => [t.friend_user_id, t.tier]) || []);

    const list: FriendWithTier[] = (profiles || []).map((p) => ({
      friend_user_id: p.user_id,
      display_name: p.display_name || "Unknown",
      avatar_url: p.avatar_url,
      initial: (p.display_name || "?").charAt(0).toUpperCase(),
      tier: tierMap.get(p.user_id) || null,
    }));

    setFriends(list);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const setTier = async (friendUserId: string, tier: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("friend_access_tiers")
      .upsert(
        { owner_id: user.id, friend_user_id: friendUserId, tier: tier as any },
        { onConflict: "owner_id,friend_user_id" }
      );
    if (error) {
      toast.error("Could not update tier");
    } else {
      setFriends((prev) => prev.map((f) => (f.friend_user_id === friendUserId ? { ...f, tier } : f)));
      toast.success("Updated!");
    }
  };

  const filtered = friends.filter((f) =>
    f.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <span className="font-display text-lg font-normal tracking-[0.35em] text-foreground">FRIENDS</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends..."
            className="pl-9 bg-muted/50 border-border/50"
          />
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <p className="font-display text-lg text-muted-foreground">
              {friends.length === 0 ? "No friends yet" : "No matches"}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Join circles to connect with friends
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {filtered.map((f, i) => (
              <motion.div
                key={f.friend_user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 bg-card border border-border/50 shadow-soft"
              >
                <button
                  onClick={() => navigate(`/profile/${f.friend_user_id}`)}
                  className="w-10 h-10 bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                >
                  {f.avatar_url ? (
                    <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-display font-bold text-primary">{f.initial}</span>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/profile/${f.friend_user_id}`)}
                    className="font-medium text-foreground text-sm hover:text-primary transition-colors truncate block"
                  >
                    {f.display_name}
                  </button>
                  {f.tier && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 ${tierLabels[f.tier]?.badge || ""}`}>
                      {tierLabels[f.tier]?.label}
                    </span>
                  )}
                </div>
                <Select value={f.tier || "none"} onValueChange={(val) => val !== "none" && setTier(f.friend_user_id, val)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Set tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>Set tier...</SelectItem>
                    <SelectItem value="close">Close</SelectItem>
                    <SelectItem value="inner">Inner circle</SelectItem>
                    <SelectItem value="outer">Everyone</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default FriendsPage;
