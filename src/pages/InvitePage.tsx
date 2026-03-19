import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Save token and redirect to auth
      sessionStorage.setItem("pending_invite_token", token || "");
      navigate("/auth", { replace: true });
      return;
    }

    if (!token) {
      navigate("/friends", { replace: true });
      return;
    }

    const acceptInvite = async () => {
      try {
        // Look up invite link by token
        const { data: invite, error: lookupError } = await supabase
          .from("invite_links")
          .select("*")
          .eq("token", token)
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (!invite) {
          toast.error("Inbjudningslänken är ogiltig.");
          navigate("/friends", { replace: true });
          return;
        }

        if (new Date(invite.expires_at) < new Date()) {
          toast.error("Inbjudningslänken har gått ut.");
          navigate("/friends", { replace: true });
          return;
        }

        if (invite.used_by) {
          toast.info("Den här inbjudan har redan använts.");
          navigate("/friends", { replace: true });
          return;
        }

        const inviterId = invite.created_by;

        if (inviterId === user.id) {
          toast.info("Du kan inte använda din egen inbjudningslänk.");
          navigate("/friends", { replace: true });
          return;
        }

        // Check if already friends
        const { data: existing } = await supabase
          .from("friend_access_tiers")
          .select("id")
          .or(
            `and(owner_id.eq.${user.id},friend_user_id.eq.${inviterId}),and(owner_id.eq.${inviterId},friend_user_id.eq.${user.id})`
          )
          .limit(1);

        if (existing && existing.length > 0) {
          toast.info("Ni är redan vänner!");
          // Mark as used anyway
          await supabase
            .from("invite_links")
            .update({ used_by: user.id })
            .eq("id", invite.id);
          navigate("/friends", { replace: true });
          return;
        }

        // Check for pending request
        const { data: pendingReq } = await supabase
          .from("friend_requests")
          .select("id, status")
          .or(
            `and(from_user_id.eq.${user.id},to_user_id.eq.${inviterId}),and(from_user_id.eq.${inviterId},to_user_id.eq.${user.id})`
          )
          .in("status", ["pending", "accepted"])
          .limit(1);

        if (pendingReq && pendingReq.length > 0) {
          toast.info("En vänförfrågan finns redan!");
          await supabase
            .from("invite_links")
            .update({ used_by: user.id })
            .eq("id", invite.id);
          navigate("/friends", { replace: true });
          return;
        }

        // Send friend request
        const { error: reqError } = await supabase
          .from("friend_requests")
          .insert({ from_user_id: user.id, to_user_id: inviterId });

        if (reqError) throw reqError;

        // Mark invite as used
        await supabase
          .from("invite_links")
          .update({ used_by: user.id })
          .eq("id", invite.id);

        // Send notification
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();

        await supabase.from("notifications").insert({
          user_id: inviterId,
          from_user_id: user.id,
          type: "friend_request",
          title: "Vänförfrågan",
          body: `${profile?.display_name || "Någon"} vill bli din vän`,
        });

        toast.success("Vänförfrågan skickad! 🎉");
        navigate("/friends", { replace: true });
      } catch (err) {
        console.error("Invite error:", err);
        toast.error("Något gick fel. Försök igen.");
        navigate("/friends", { replace: true });
      }
    };

    acceptInvite();
  }, [user, token, authLoading, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#F7F3EF" }}
    >
      <p className="text-[13px]" style={{ color: "#9B8BA5" }}>
        Bearbetar inbjudan...
      </p>
    </div>
  );
};

export default InvitePage;
