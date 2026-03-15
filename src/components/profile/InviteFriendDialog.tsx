import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

const InviteFriendDialog = () => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Ange en giltig e-postadress");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: { email: email.trim(), message: message.trim() },
      });

      if (error) throw error;

      if (data?.error === "already_registered") {
        toast.info(data.message);
      } else {
        toast.success("Inbjudan skickad! 🎉");
        setEmail("");
        setMessage("");
        setOpen(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte skicka inbjudan. Försök igen.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <UserPlus className="w-3.5 h-3.5" />
          <span>Bjud in en vän</span>
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-[14px] border-[0.5px] border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-base font-medium">
            Bjud in en vän
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              E-postadress
            </label>
            <Input
              type="email"
              placeholder="namn@exempel.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Personligt meddelande (valfritt)
            </label>
            <Textarea
              placeholder="Hej! Jag tror du skulle gilla Minby..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
              rows={3}
              className="text-sm resize-none"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={sending || !email}
            className="w-full rounded-[10px] text-sm"
          >
            {sending ? "Skickar..." : "Skicka inbjudan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteFriendDialog;
