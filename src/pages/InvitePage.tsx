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
          toast.info("Ni är redan i varandras krets!");
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
          toast.info("Ni har redan en koppling!");
          await supabase
            .from("invite_links")
            .update({ used_by: user.id })
            .eq("id", invite.id);
          navigate("/friends", { replace: true });
          return;
        }

        // Create accepted friend request (invite = implicit acceptance)
        const { error: reqError } = await supabase
          .from("friend_requests")
          .insert({ from_user_id: inviterId, to_user_id: user.id, status: "accepted" });

        if (reqError) throw reqError;

        // Create friend_access_tier for current user's side (RLS allows owner_id = auth.uid())
        await supabase.from("friend_access_tiers").insert({
          owner_id: user.id, friend_user_id: inviterId, tier: "outer" as const,
        });
        // The inviter's side will be created via an edge function or they can add manually
        // For now, use a service-role edge function to create the inviter's tier
        try {
          await supabase.functions.invoke("accept-invite-friendship", {
            body: { inviter_id: inviterId, invitee_id: user.id },
          });
        } catch {
          // Non-critical: inviter can still add the tier manually
        }

        // Mark invite as used
        await supabase
          .from("invite_links")
          .update({ used_by: user.id })
          .eq("id", invite.id);

        // Send notification to inviter
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();

        await supabase.from("notifications").insert({
          user_id: inviterId,
          from_user_id: user.id,
          type: "invite_accepted",
          title: `${profile?.display_name || "Någon"} har gått med i din krets!`,
          body: `${profile?.display_name || "Någon"} har gått med i din krets via din inbjudan`,
        });

        toast.success("Ni är nu i varandras krets!");
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
      style={{ backgroundColor: "hsl(var(--color-surface))" }}
    >
      <p className="text-[13px]" style={{ color: "hsl(var(--color-text-muted))" }}>
        Bearbetar inbjudan...
      </p>
    </div>
  );
};

export default InvitePage;
