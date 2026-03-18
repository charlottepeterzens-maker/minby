import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const InvitePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!userId || userId === user.id) {
      navigate("/friends", { replace: true });
      return;
    }

    const sendRequest = async () => {
      // Check if already friends
      const { data: existing } = await supabase
        .from("friend_access_tiers")
        .select("id")
        .or(`and(owner_id.eq.${user.id},friend_user_id.eq.${userId}),and(owner_id.eq.${userId},friend_user_id.eq.${user.id})`)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.info("Ni är redan vänner!");
        navigate("/friends", { replace: true });
        return;
      }

      // Check if request already exists
      const { data: pendingReq } = await supabase
        .from("friend_requests")
        .select("id, status")
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${userId}),and(from_user_id.eq.${userId},to_user_id.eq.${user.id})`)
        .in("status", ["pending", "accepted"])
        .limit(1);

      if (pendingReq && pendingReq.length > 0) {
        toast.info("En förfrågan finns redan!");
        navigate("/friends", { replace: true });
        return;
      }

      // Send friend request
      const { error } = await supabase.from("friend_requests").insert({
        from_user_id: user.id,
        to_user_id: userId,
      });

      if (error) {
        toast.error("Kunde inte skicka vänförfrågan");
      } else {
        // Send notification
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();

        await supabase.from("notifications").insert({
          user_id: userId,
          from_user_id: user.id,
          type: "friend_request",
          title: "Vänförfrågan",
          body: `${profile?.display_name || "Någon"} vill bli din vän`,
        });

        toast.success("Vänförfrågan skickad! 🎉");
      }
      navigate("/friends", { replace: true });
    };

    sendRequest();
  }, [user, userId, authLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F7F3EF" }}>
      <p className="text-[13px]" style={{ color: "#9B8BA5" }}>Bearbetar inbjudan...</p>
    </div>
  );
};

export default InvitePage;
