import { useState, type ReactNode } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface InviteFriendDialogProps {
  trigger?: ReactNode;
}

const InviteFriendDialog = ({ trigger }: InviteFriendDialogProps = {}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const getOrCreateLink = async (): Promise<string | null> => {
    if (!user) return null;

    // Reuse an existing unexpired, unused link if possible
    const { data: existing } = await (supabase as any)
      .from("invite_links")
      .select("token, expires_at")
      .eq("created_by", user.id)
      .is("used_by", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let token: string | undefined = existing?.token;

    if (!token) {
      token = crypto.randomUUID();
      const { error } = await (supabase as any).from("invite_links").insert({
        created_by: user.id,
        token,
      });
      if (error) throw error;
    }

    return `${window.location.origin}/invite/${token}`;
  };

  const handleClick = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const link = await getOrCreateLink();
      if (!link) return;

      const shareData = {
        title: "Gå med i min krets på Minby",
        text: "Jag vill bjuda in dig till Minby – appen för äkta kontakt med de som betyder mest.",
        url: link,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err: any) {
          if (err?.name !== "AbortError") {
            await navigator.clipboard.writeText(link);
            toast.success("Länk kopierad!");
          }
        }
      } else {
        await navigator.clipboard.writeText(link);
        toast.success("Länk kopierad – dela hur du vill.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte skapa inbjudningslänk. Försök igen.");
    } finally {
      setLoading(false);
    }
  };

  if (trigger) {
    return (
      <span
        onClick={handleClick}
        className={loading ? "pointer-events-none opacity-50" : "cursor-pointer"}
      >
        {trigger}
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs transition-colors"
      style={{ color: "#C4522A" }}
    >
      <UserPlus className="w-3.5 h-3.5" />
      <span>{loading ? "Skapar länk..." : "Bjud in någon till din vardag"}</span>
    </button>
  );
};

export default InviteFriendDialog;
