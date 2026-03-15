import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import ScrollToTopButton from "@/components/ScrollToTopButton";

interface FriendWithTier {
  friend_user_id: string;
  display_name: string;
  avatar_url: string | null;
  initial: string;
  tier: string | null;
}

const FriendsPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendWithTier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const tierLabels: Record<string, { label: string; color: string }> = {
    close: { label: t("close"), color: "bg-lavender-bg text-secondary-foreground" },
    inner: { label: t("innerCircle"), color: "bg-dusty-rose-bg text-foreground" },
    outer: { label: t("everyone"), color: "bg-muted text-muted-foreground" },
  };

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
      toast.error(t("couldNotUpdateTier"));
    } else {
      setFriends((prev) => prev.map((f) => (f.friend_user_id === friendUserId ? { ...f, tier } : f)));
      toast.success(t("updated"));
    }
  };

  const filtered = friends.filter((f) =>
    f.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-4">
          <span className="font-display text-lg font-medium text-foreground">{t("friends")}</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-5">
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchFriends")}
            className="pl-9 bg-card border-[0.5px] border-border rounded-[10px]"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-muted rounded-[14px] h-16 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-lg text-muted-foreground">
              {friends.length === 0 ? t("noFriendsYet") : t("noMatches")}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {t("joinCirclesHint")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((f) => (
              <div
                key={f.friend_user_id}
                className="flex items-center gap-3 p-3 bg-card rounded-[14px] border-[0.5px] border-border"
              >
                <button
                  onClick={() => navigate(`/profile/${f.friend_user_id}`)}
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0"
                >
                  {f.avatar_url ? (
                    <img src={f.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-sm font-display text-secondary">{f.initial}</span>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/profile/${f.friend_user_id}`)}
                    className="font-medium text-foreground text-sm hover:underline truncate block"
                  >
                    {f.display_name}
                  </button>
                  {f.tier && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-[20px] inline-block mt-0.5 ${tierLabels[f.tier]?.color || ""}`}>
                      {tierLabels[f.tier]?.label}
                    </span>
                  )}
                </div>
                <Select value={f.tier || "none"} onValueChange={(val) => val !== "none" && setTier(f.friend_user_id, val)}>
                  <SelectTrigger className="w-[120px] h-8 text-xs rounded-[10px] border-[0.5px]">
                    <SelectValue placeholder={t("setTier")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>{t("setTier")}</SelectItem>
                    <SelectItem value="close">{t("close")}</SelectItem>
                    <SelectItem value="inner">{t("innerCircle")}</SelectItem>
                    <SelectItem value="outer">{t("everyone")}</SelectItem>
                  </SelectContent>
                </Select>
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

export default FriendsPage;
