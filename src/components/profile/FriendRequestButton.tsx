import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Clock, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  targetUserId: string;
}

type RequestStatus = "none" | "sent" | "received" | "friends";

const FriendRequestButton = ({ targetUserId }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = useState<RequestStatus>("none");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!user) return;

    // Check if already friends (has tier access)
    const { data: tier } = await supabase
      .from("friend_access_tiers")
      .select("id")
      .or(`and(owner_id.eq.${user.id},friend_user_id.eq.${targetUserId}),and(owner_id.eq.${targetUserId},friend_user_id.eq.${user.id})`)
      .limit(1);

    if (tier && tier.length > 0) {
      setStatus("friends");
      setLoading(false);
      return;
    }

    // Check pending requests
    const { data: requests } = await supabase
      .from("friend_requests")
      .select("*")
      .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${targetUserId}),and(from_user_id.eq.${targetUserId},to_user_id.eq.${user.id})`)
      .eq("status", "pending")
      .limit(1);

    if (requests && requests.length > 0) {
      const req = requests[0] as any;
      setRequestId(req.id);
      if (req.from_user_id === user.id) {
        setStatus("sent");
      } else {
        setStatus("received");
      }
    } else {
      setStatus("none");
    }
    setLoading(false);
  }, [user, targetUserId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const sendRequest = async () => {
    if (!user) return;
    const { error } = await supabase.from("friend_requests").insert({
      from_user_id: user.id,
      to_user_id: targetUserId,
    });
    if (error) {
      toast({ title: t("error"), description: t("couldNotSendRequest"), variant: "destructive" });
    } else {
      // Send notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      await supabase.from("notifications").insert({
        user_id: targetUserId,
        from_user_id: user.id,
        type: "friend_request",
        title: t("friendRequestReceived"),
        body: `${profile?.display_name || t("someone")} ${t("wantsToBeYourFriend")}`,
      });

      toast({ title: t("requestSent") });
      setStatus("sent");
    }
  };

  const acceptRequest = async () => {
    if (!user || !requestId) return;
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) {
      toast({ title: t("error"), variant: "destructive" });
      return;
    }

    // Add mutual access tiers (outer by default)
    await supabase.from("friend_access_tiers").upsert([
      { owner_id: user.id, friend_user_id: targetUserId, tier: "outer" as const },
      { owner_id: targetUserId, friend_user_id: user.id, tier: "outer" as const },
    ], { onConflict: "owner_id,friend_user_id" });

    // Notify sender
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    await supabase.from("notifications").insert({
      user_id: targetUserId,
      from_user_id: user.id,
      type: "friend_accepted",
      title: t("friendRequestAccepted"),
      body: `${profile?.display_name || t("someone")} ${t("acceptedYourRequest")}`,
    });

    toast({ title: t("friendAdded") });
    setStatus("friends");
  };

  const cancelRequest = async () => {
    if (!requestId) return;
    await supabase.from("friend_requests").delete().eq("id", requestId);
    setStatus("none");
    setRequestId(null);
  };

  if (loading) return null;

  if (status === "friends") {
    return (
      <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary" disabled>
        <UserCheck className="w-3.5 h-3.5" /> {t("friendsStatus")}
      </Button>
    );
  }

  if (status === "sent") {
    return (
      <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={cancelRequest}>
        <Clock className="w-3.5 h-3.5" /> {t("requestPending")}
      </Button>
    );
  }

  if (status === "received") {
    return (
      <div className="flex gap-1">
        <Button variant="default" size="sm" className="text-xs gap-1" onClick={acceptRequest}>
          <UserCheck className="w-3.5 h-3.5" /> {t("accept")}
        </Button>
        <Button variant="ghost" size="sm" className="text-xs" onClick={cancelRequest}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" className="text-xs gap-1" onClick={sendRequest}>
      <UserPlus className="w-3.5 h-3.5" /> {t("addFriend")}
    </Button>
  );
};

export default FriendRequestButton;
