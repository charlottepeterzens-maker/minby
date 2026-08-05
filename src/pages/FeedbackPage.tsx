import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import TextButton from "@/components/ui/text-button";
import { Typography } from "@/components/ui/typography";
import { toast } from "sonner";

/**
 * FeedbackPage — a calm, personal place to leave a thought.
 *
 * No cards, no illustrations, no heavy forms. Just a question and a place to answer.
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
        <PageHeader title="Hjälp oss bygga Minby" />

        <main className="pt-400 pb-500 space-y-500">
          <div className="space-y-300">
            <Typography as="p" variant="body">
              Minby är fortfarande under utveckling.
            </Typography>
            <Typography as="p" variant="body">
              Därför kan du fortfarande påverka hur appen blir.
            </Typography>
            <Typography as="p" variant="body">
              Har du hittat något som inte fungerar, har du en idé eller saknar du något?
            </Typography>
            <Typography as="p" variant="body">
              Berätta gärna.
            </Typography>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Skriv din feedback…"
            className="min-h-[130px]"
            disabled={sending}
          />

          <div className="space-y-300">
            <TextButton
              onClick={handleSubmit}
              disabled={sending || !text.trim()}
            >
              {sending ? "Skickar..." : "Skicka feedback"}
            </TextButton>

            <Typography as="p" variant="meta">
              Tack för att du hjälper oss bygga Minby.
            </Typography>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FeedbackPage;
