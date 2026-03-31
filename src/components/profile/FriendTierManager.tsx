import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface FriendWithTier {
  friend_user_id: string;
  display_name: string;
  initial: string;
  tier: string | null;
}

const FriendTierManager = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [friends, setFriends] = useState<FriendWithTier[]>([]);

  const fetchFriends = useCallback(async () => {
    if (!user) return;

    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", user.id);

    if (!memberships?.length) return;

    const groupIds = memberships.map((m) => m.group_id);

    const { data: allMembers } = await supabase
      .from("group_memberships")
      .select("user_id")
      .in("group_id", groupIds)
      .neq("user_id", user.id);

    if (!allMembers?.length) return;

    const uniqueIds = [...new Set(allMembers.map((m) => m.user_id))];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", uniqueIds);

    const { data: tiers } = await supabase
      .from("friend_access_tiers")
      .select("friend_user_id, tier")
      .eq("owner_id", user.id);

    const tierMap = new Map(tiers?.map((t) => [t.friend_user_id, t.tier]) || []);

    const friendsList: FriendWithTier[] = (profiles || []).map((p) => ({
      friend_user_id: p.user_id,
      display_name: p.display_name || "Unknown",
      initial: (p.display_name || "?").charAt(0).toUpperCase(),
      tier: tierMap.get(p.user_id) || null,
    }));

    setFriends(friendsList);
  }, [user]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

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
      setFriends((prev) =>
        prev.map((f) => (f.friend_user_id === friendUserId ? { ...f, tier } : f))
      );
      toast.success(t("updated"));
    }
  };

  if (friends.length === 0) {
    return (
      <Card className="border-border/50 shadow-card">
        <CardContent className="p-5 text-center text-sm text-muted-foreground">
          {t("joinGroupsFirst")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-base">
          {t("friendAccessTiers")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {friends.map((f) => (
          <div key={f.friend_user_id} className="flex items-center gap-3 py-1">
            <div className="w-8 h-8 bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {f.initial}
            </div>
            <span className="flex-1 text-sm font-medium text-foreground truncate">{f.display_name}</span>
            <Select value={f.tier || "none"} onValueChange={(val) => val !== "none" && setTier(f.friend_user_id, val)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder={t("setTier")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>{t("setTier")}</SelectItem>
                <SelectItem value="close">{t("close")}</SelectItem>
                <SelectItem value="outer">{t("everyone")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default FriendTierManager;
