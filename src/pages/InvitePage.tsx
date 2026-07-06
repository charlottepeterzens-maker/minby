import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Heart } from "lucide-react";

type PreviewStatus = "loading" | "ok" | "expired" | "invalid";

interface InvitePreview {
  status: PreviewStatus;
  inviter_id?: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

type AcceptState = "idle" | "accepting" | "accepted" | "already_friends";

const InvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<InvitePreview>({ status: "loading" });
  const [acceptState, setAcceptState] = useState<AcceptState>("idle");

  // Fetch preview (works signed-out via public edge function)
  useEffect(() => {
    if (!token) {
      setPreview({ status: "invalid" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-invite-preview", {
          method: "GET" as any,
          body: undefined,
          headers: {},
          // supabase-js doesn't support query params directly; use fetch fallback
        } as any);
        if (error || !data) throw error ?? new Error("no data");
        if (!cancelled) setPreview(data as InvitePreview);
      } catch {
        // fallback: direct fetch with query param
        try {
          const res = await fetch(
            `https://heuxlipzvlifyynwljxw.supabase.co/functions/v1/get-invite-preview?token=${encodeURIComponent(
              token,
            )}`,
          );
          const data = await res.json();
          if (!cancelled) setPreview(data as InvitePreview);
        } catch {
          if (!cancelled) setPreview({ status: "invalid" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const goToAuth = () => {
    sessionStorage.setItem("pending_invite_token", token || "");
    navigate("/auth", { replace: true });
  };

  const acceptInvite = async () => {
    if (!user || !token || acceptState !== "idle") return;
    setAcceptState("accepting");
    try {
      const { data: invite, error: lookupError } = await supabase
        .from("invite_links")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!invite) {
        setPreview({ status: "invalid" });
        setAcceptState("idle");
        return;
      }
      if (new Date(invite.expires_at) < new Date()) {
        setPreview({ status: "expired" });
        setAcceptState("idle");
        return;
      }

      const inviterId = invite.created_by;

      if (inviterId === user.id) {
        toast.info("Du kan inte använda din egen inbjudningslänk.");
        navigate("/friends", { replace: true });
        return;
      }

      const { data: existing } = await supabase
        .from("friend_access_tiers")
        .select("id")
        .or(
          `and(owner_id.eq.${user.id},friend_user_id.eq.${inviterId}),and(owner_id.eq.${inviterId},friend_user_id.eq.${user.id})`,
        )
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase.from("invite_links").update({ used_by: user.id }).eq("id", invite.id);
        setAcceptState("already_friends");
        return;
      }

      const { data: pendingReq } = await supabase
        .from("friend_requests")
        .select("id, status")
        .or(
          `and(from_user_id.eq.${user.id},to_user_id.eq.${inviterId}),and(from_user_id.eq.${inviterId},to_user_id.eq.${user.id})`,
        )
        .in("status", ["pending", "accepted"])
        .limit(1);

      if (pendingReq && pendingReq.length > 0) {
        await supabase.from("invite_links").update({ used_by: user.id }).eq("id", invite.id);
        setAcceptState("already_friends");
        return;
      }

      const { error: reqError } = await supabase
        .from("friend_requests")
        .insert({ from_user_id: inviterId, to_user_id: user.id, status: "accepted" });
      if (reqError) throw reqError;

      await supabase.from("friend_access_tiers").insert({
        owner_id: user.id,
        friend_user_id: inviterId,
        tier: "outer" as const,
      });

      try {
        await supabase.functions.invoke("accept-invite-friendship", {
          body: { inviter_id: inviterId, invitee_id: user.id },
        });
      } catch {
        /* non-critical */
      }

      await supabase.from("invite_links").update({ used_by: user.id }).eq("id", invite.id);

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

      setAcceptState("accepted");
    } catch (err) {
      console.error("Invite error:", err);
      toast.error("Något gick fel. Försök igen.");
      setAcceptState("idle");
    }
  };

  const inviterName = preview.display_name || "Någon";
  const initials = inviterName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "hsl(var(--color-surface))" }}
    >
      <div className="w-full max-w-[400px] flex flex-col items-center text-center">
        {children}
      </div>
    </div>
  );

  if (preview.status === "loading" || authLoading) {
    return (
      <Shell>
        <Loader2
          className="w-5 h-5 animate-spin"
          style={{ color: "hsl(var(--color-text-muted))" }}
        />
      </Shell>
    );
  }

  if (preview.status === "invalid") {
    return (
      <Shell>
        <h1 className="font-display text-xl mb-2" style={{ color: "hsl(var(--color-text-primary))" }}>
          Inbjudan hittades inte
        </h1>
        <p className="text-sm mb-6" style={{ color: "hsl(var(--color-text-muted))" }}>
          Länken verkar vara felaktig eller borttagen.
        </p>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="text-sm font-medium rounded-lg px-4 py-2"
          style={{ backgroundColor: "#561828", color: "#F7F3EF" }}
        >
          Till startsidan
        </button>
      </Shell>
    );
  }

  if (preview.status === "expired") {
    return (
      <Shell>
        <h1 className="font-display text-xl mb-2" style={{ color: "hsl(var(--color-text-primary))" }}>
          Inbjudan har gått ut
        </h1>
        <p className="text-sm mb-6" style={{ color: "hsl(var(--color-text-muted))" }}>
          Be {inviterName} om en ny länk.
        </p>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="text-sm font-medium rounded-lg px-4 py-2"
          style={{ backgroundColor: "#561828", color: "#F7F3EF" }}
        >
          Till startsidan
        </button>
      </Shell>
    );
  }

  // status === "ok"
  const Avatar = (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden mb-5"
      style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
    >
      {preview.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview.avatar_url} alt={inviterName} className="w-full h-full object-cover" />
      ) : (
        <span
          className="font-display text-2xl"
          style={{ color: "hsl(var(--color-text-primary))" }}
        >
          {initials || "?"}
        </span>
      )}
    </div>
  );

  if (acceptState === "accepted") {
    return (
      <Shell>
        {Avatar}
        <Heart
          className="w-6 h-6 mb-3"
          style={{ color: "#C4522A" }}
          fill="#C4522A"
        />
        <h1
          className="font-display text-xl mb-2"
          style={{ color: "hsl(var(--color-text-primary))" }}
        >
          Ni är i varandras krets
        </h1>
        <p className="text-sm mb-6" style={{ color: "hsl(var(--color-text-muted))" }}>
          Du och {inviterName} kan nu se varandras vardag.
        </p>
        <button
          onClick={() => navigate("/friends", { replace: true })}
          className="text-sm font-medium rounded-lg px-5 py-2.5"
          style={{ backgroundColor: "#561828", color: "#F7F3EF" }}
        >
          Gå till min krets
        </button>
      </Shell>
    );
  }

  if (acceptState === "already_friends") {
    return (
      <Shell>
        {Avatar}
        <h1
          className="font-display text-xl mb-2"
          style={{ color: "hsl(var(--color-text-primary))" }}
        >
          Ni är redan i varandras krets
        </h1>
        <p className="text-sm mb-6" style={{ color: "hsl(var(--color-text-muted))" }}>
          Inget mer behövs — {inviterName} finns redan hos dig.
        </p>
        <button
          onClick={() => navigate("/friends", { replace: true })}
          className="text-sm font-medium rounded-lg px-5 py-2.5"
          style={{ backgroundColor: "#561828", color: "#F7F3EF" }}
        >
          Gå till min krets
        </button>
      </Shell>
    );
  }

  // Signed out — show preview + login CTA
  if (!user) {
    return (
      <Shell>
        {Avatar}
        <h1
          className="font-display text-xl mb-2"
          style={{ color: "hsl(var(--color-text-primary))" }}
        >
          {inviterName} vill ha dig i sin krets
        </h1>
        <p className="text-sm mb-6" style={{ color: "hsl(var(--color-text-muted))" }}>
          Minby är en varm plats för de som betyder mest. Skapa ett konto för att gå med.
        </p>
        <button
          onClick={goToAuth}
          className="text-sm font-medium rounded-lg px-5 py-2.5 w-full max-w-[240px]"
          style={{ backgroundColor: "#561828", color: "#F7F3EF" }}
        >
          Skapa konto och gå med
        </button>
      </Shell>
    );
  }

  // Signed in — confirm before accepting
  return (
    <Shell>
      {Avatar}
      <h1
        className="font-display text-xl mb-2"
        style={{ color: "hsl(var(--color-text-primary))" }}
      >
        {inviterName} vill ha dig i sin krets
      </h1>
      <p className="text-sm mb-6" style={{ color: "hsl(var(--color-text-muted))" }}>
        Ni får se varandras vardag när du går med.
      </p>
      <button
        onClick={acceptInvite}
        disabled={acceptState === "accepting"}
        className="text-sm font-medium rounded-lg px-5 py-2.5 w-full max-w-[240px] disabled:opacity-60"
        style={{ backgroundColor: "#561828", color: "#F7F3EF" }}
      >
        {acceptState === "accepting" ? "Går med..." : "Gå med i kretsen"}
      </button>
    </Shell>
  );
};

export default InvitePage;
