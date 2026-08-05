import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { toast } from "sonner";

/**
 * FeedbackPage — a lightweight, personal place to share thoughts.
 *
 * No cards, no illustrations, just a clear question and a place to answer.
 */
const FeedbackPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Skriv några rader innan du skickar.");
      return;
    }
    if (!user) {
      toast.error("Du måste vara inloggad för att skicka feedback.");
      return;
    }

    setSending(true);
    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      content: trimmed,
    });
    setSending(false);

    if (error) {
      toast.error("Kunde inte skicka feedback. Försök igen om en stund.");
      return;
    }

    toast.success("Tack för din feedback!");
    setText("");
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-300 pt-safe pb-safe">
        <PageHeader title="Feedback" />

        <main className="pt-200 pb-500 space-y-400">
          <div className="space-y-300">
            <Typography as="p" variant="body" className="text-foreground">
              Minby är fortfarande under utveckling.
            </Typography>
            <Typography as="p" variant="body" className="text-foreground">
              Det betyder att du kan påverka hur appen blir.
            </Typography>
            <Typography as="p" variant="body" className="text-foreground">
              Har du hittat något som inte fungerar?
            </Typography>
            <Typography as="p" variant="body" className="text-foreground">
              Har du en idé?
            </Typography>
            <Typography as="p" variant="body" className="text-foreground">
              Eller saknar du något?
            </Typography>
            <Typography as="p" variant="body" className="text-foreground">
              Berätta gärna.
            </Typography>
          </div>

          <div className="space-y-300">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Vad vill du berätta?"
              className="min-h-[160px] rounded-200 bg-butter-100 border-0 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              disabled={sending}
            />

            <div className="border-t border-line-subtle" />

            <Button
              onClick={handleSubmit}
              disabled={sending || !text.trim()}
              className="w-full min-h-11 rounded-300 text-primary-foreground"
            >
              {sending ? "Skickar..." : "Skicka feedback"}
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FeedbackPage;
