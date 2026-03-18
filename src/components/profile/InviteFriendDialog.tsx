import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const InviteFriendDialog = () => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  import { useState } from "react";
  import { UserPlus, Copy, Share2 } from "lucide-react";
  import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
  import { supabase } from "@/integrations/supabase/client";
  import { useAuth } from "@/contexts/AuthContext";
  import { toast } from "sonner";

  const InviteFriendDialog = () => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [link, setLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const generateLink = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const token = crypto.randomUUID();
        const { error } = await supabase.from("invite_links").insert({
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
        <button
          onClick={generateLink}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{loading ? "Skapar länk..." : "Bjud in en vän till din vardag"}</span>
        </button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-[20px]"
            style={{ backgroundColor: "#F7F3EF", padding: "24px 16px" }}
          >
            <SheetHeader>
              <SheetTitle className="font-display text-base font-medium text-left">Bjud in en vän</SheetTitle>
            </SheetHeader>

            <p className="text-sm text-muted-foreground mt-2 mb-4">
              Dela länken hur du vill – via SMS, WhatsApp eller din egen mail.
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <UserPlus className="w-3.5 h-3.5" />
          <span>Bjud in en vän till din vardag</span>
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-[14px] border-[0.5px] border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-medium">Bjud in en vän</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">E-postadress</label>
            <Input
              type="email"
              placeholder="namn@exempel.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Personligt meddelande (valfritt)</label>
            <Textarea
              placeholder="Hej! Jag tror du skulle gilla Minby..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <Button onClick={handleSend} disabled={sending || !email} className="w-full rounded-[10px] text-sm">
            {sending ? "Skickar..." : "Skicka inbjudan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteFriendDialog;
