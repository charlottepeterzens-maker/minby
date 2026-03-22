import { useState, type ReactNode } from "react";
import { UserPlus, Copy, Share2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface InviteFriendDialogProps {
  trigger?: ReactNode;
}

const InviteFriendDialog = ({ trigger }: InviteFriendDialogProps = {}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateLink = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = crypto.randomUUID();
      const { error } = await (supabase as any).from("invite_links").insert({
        created_by: user.id,
        token,
      });
      if (error) throw error;
      const appUrl = window.location.origin;
      setLink(`${appUrl}/invite/${token}`);
      setOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte skapa inbjudningslänk. Försök igen.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Länk kopierad!");
  };

  const handleShare = async () => {
    if (!link) return;
    if (navigator.share) {
      await navigator.share({
        title: "Gå med i min krets på Minby",
        text: "Jag vill bjuda in dig till Minby – appen för äkta kontakt med de som betyder mest.",
        url: link,
      });
    } else {
      handleCopy();
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={generateLink} className={loading ? "pointer-events-none opacity-50" : "cursor-pointer"}>
          {trigger}
        </span>
      ) : (
        <button
          onClick={generateLink}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{loading ? "Skapar länk..." : "Bjud in någon till din vardag"}</span>
        </button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[20px]"
          style={{ backgroundColor: "#F7F3EF", padding: "24px 16px" }}
        >
          <SheetHeader>
            <SheetTitle className="font-display text-base font-medium text-left">Bjud in någon</SheetTitle>
          </SheetHeader>

          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Dela länken hur du vill, via SMS, WhatsApp eller din egen mail.
          </p>

          <div
            style={{
              background: "#EDE8F4",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 12,
              color: "#3C2A4D",
              wordBreak: "break-all",
              marginBottom: 16,
            }}
          >
            {link}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleCopy}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: "#EDE8F4",
                color: "#3C2A4D",
                borderRadius: 10,
                padding: "10px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Copy style={{ width: 14, height: 14 }} />
              Kopiera länk
            </button>
            <button
              onClick={handleShare}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                background: "#3C2A4D",
                color: "#F7F3EF",
                borderRadius: 10,
                padding: "10px",
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Share2 style={{ width: 14, height: 14 }} />
              Dela
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default InviteFriendDialog;
