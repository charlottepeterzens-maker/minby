import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Copy, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

interface Props {
  onComplete: () => void;
  onDismiss: () => void;
}

const FirstTimeOverlay = ({ onComplete, onDismiss }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"invite" | "done">("invite");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const generateAndOpen = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const token = crypto.randomUUID();
      const { error } = await (supabase as any).from("invite_links").insert({
        created_by: user.id,
        token,
      });
      if (error) throw error;
      setLink(`${window.location.origin}/invite/${token}`);
      setSheetOpen(true);
    } catch {
      toast.error("Kunde inte skapa länk. Försök igen.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Länk kopierad!");
    setSheetOpen(false);
    setStep("done");
  };

  const handleShare = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Gå med i min by på Minby",
          text: "Jag vill bjuda in dig till Minby – appen för äkta kontakt med de som betyder mest.",
          url: link,
        });
        setSheetOpen(false);
        setStep("done");
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-5 bg-black/30 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          {step === "invite" && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-[320px]"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #EDE8F4",
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: "#EDE8F4" }}
              >
                <UserPlus className="w-5 h-5" style={{ color: "#3C2A4D" }} />
              </div>

              <h2
                className="font-display text-center mb-2"
                style={{ fontWeight: 500, fontSize: 20, color: "#3C2A4D" }}
              >
                Din by börjar här
              </h2>
              <p
                className="text-center mb-6"
                style={{ fontSize: 13, color: "#7A6A85", lineHeight: 1.6 }}
              >
                Bjud in de du faktiskt vill dela livet med. Det här är din lilla krets – inte hela världen.
              </p>

              <button
                onClick={generateAndOpen}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 text-[13px] font-medium"
                style={{
                  backgroundColor: "#3C2A4D",
                  color: "#fff",
                  borderRadius: 20,
                  height: 48,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {generating ? "..." : "Bjud in din första person"}
              </button>

              <button
                onClick={onDismiss}
                className="w-full mt-3 text-[12px]"
                style={{ color: "#7A6A85", background: "none", border: "none", cursor: "pointer" }}
              >
                Hoppa över
              </button>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-[320px]"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #EDE8F4",
                borderRadius: 16,
                padding: 24,
                textAlign: "center",
              }}
            >
              <p className="text-2xl mb-3">💛</p>
              <h2
                className="font-display mb-2"
                style={{ fontWeight: 500, fontSize: 18, color: "#3C2A4D" }}
              >
                Du är igång
              </h2>
              <p style={{ fontSize: 13, color: "#7A6A85", lineHeight: 1.6 }}>
                Din by börjar ta form.
              </p>
              <button
                onClick={onComplete}
                className="w-full mt-5 text-[13px] font-medium"
                style={{
                  backgroundColor: "#3C2A4D",
                  color: "#fff",
                  borderRadius: 20,
                  height: 48,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Fortsätt
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Invite share sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-[20px] z-[70]"
          style={{ backgroundColor: "#F7F3EF", padding: "24px 16px" }}
        >
          <SheetHeader>
            <SheetTitle className="font-display text-base font-medium text-left">
              Dela inbjudan
            </SheetTitle>
          </SheetHeader>

          <p className="text-sm mt-2 mb-4" style={{ color: "#7A6A85" }}>
            Dela länken via SMS, WhatsApp eller hur du vill.
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
                padding: 10,
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Share2 style={{ width: 14, height: 14 }} />
              Dela
            </button>
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
                padding: 10,
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Copy style={{ width: 14, height: 14 }} />
              Kopiera
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default FirstTimeOverlay;
