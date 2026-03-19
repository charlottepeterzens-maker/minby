import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import InviteFriendDialog from "@/components/profile/InviteFriendDialog";
import QRCodeSheet from "@/components/profile/QRCodeSheet";

interface Props {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [showInvite, setShowInvite] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const markOnboarded = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);
  };

  const next = async () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleInviteAction = () => {
    setShowInvite(true);
  };

  const handleQRAction = () => {
    setShowQR(true);
  };

  const handleFinish = async () => {
    await markOnboarded();
    onComplete();
  };

  const dots = (
    <div className="flex justify-center gap-2 mb-8">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === step ? 18 : 6,
            height: 6,
            backgroundColor: i === step ? "#3C2A4D" : "#C9B8D8",
            borderRadius: 99,
          }}
        />
      ))}
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#F7F3EF" }}
    >
      <div className="w-full max-w-sm">
        {dots}

        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepCard key="s0">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "#3C2A4D" }}>
                Du har sagt "vi måste ses" och menat det. Ändå gick månaderna.
              </h1>
              <p className="font-light text-[15px] leading-relaxed mb-8" style={{ color: "#7A6A85" }}>
                Vi scrollar förbi varandras liv utan att riktigt stanna upp. Vi vet att Anna bygger hus – men inte hur det känns för henne.
              </p>
              <OnboardingButton onClick={next}>Ja, precis så →</OnboardingButton>
            </StepCard>
          )}

          {step === 1 && (
            <StepCard key="s1">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "#3C2A4D" }}>
                Minby är något annat.
              </h1>
              <p className="font-light text-[15px] leading-relaxed mb-3" style={{ color: "#7A6A85" }}>
                En liten, sluten plats – bara för de du faktiskt håller av. Ingen algoritm. Inga främmande ögon. Bara din by.
              </p>
              <p className="text-[13px] mb-8" style={{ color: "#B0A8B5" }}>
                De 10–15 personer som du faktiskt vill ha i ditt liv.
              </p>
              <OnboardingButton onClick={next}>Det låter rätt →</OnboardingButton>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard key="s2">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "#3C2A4D" }}>
                Två enkla saker. Det är allt.
              </h1>
              <p className="font-light text-[15px] leading-relaxed mb-6" style={{ color: "#7A6A85" }}>
                Dela det som faktiskt händer. Och när du vill ses – säg till.
              </p>

              {/* Mini cards */}
              <div className="flex gap-3 mb-8">
                <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: "#FCF0F3" }}>
                  <p className="font-light text-[11px] mb-1" style={{ color: "#7A6A85" }}>Vardagen</p>
                  <p className="font-fraunces text-[13px] font-medium leading-snug mb-3" style={{ color: "#3C2A4D" }}>
                    Jobbet gick äntligen rätt idag
                  </p>
                  <span
                    className="inline-block text-[11px] px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#FCE4EC" }}
                  >
                    ❤️
                  </span>
                </div>
                <div className="flex-1 rounded-xl p-4" style={{ backgroundColor: "#EAF2E8" }}>
                  <p className="font-light text-[11px] mb-1" style={{ color: "#7A6A85" }}>Ses vi?</p>
                  <p className="font-fraunces text-[13px] font-medium leading-snug mb-3" style={{ color: "#3C2A4D" }}>
                    Sugen på en promenad i helgen
                  </p>
                  <span
                    className="inline-block text-[11px] px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "#EAF2E8",
                      border: "1px solid #B5CCBF",
                      color: "#1F4A1A",
                    }}
                  >
                    häng med
                  </span>
                </div>
              </div>

              <OnboardingButton onClick={next}>Enkelt →</OnboardingButton>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard key="s3">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "#3C2A4D" }}>
                Vem vill du ha i din by?
              </h1>
              <p className="font-light text-[15px] leading-relaxed mb-6" style={{ color: "#7A6A85" }}>
                Bjud in en person du faktiskt vill hålla kontakten med. Det tar en minut – och det är där allt börjar.
              </p>

              {/* Action cards */}
              <div className="space-y-3 mb-4">
                <button
                  onClick={handleInviteAction}
                  className="w-full flex items-center gap-3 text-left"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #EDE8E0",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "#EDE8F4" }}
                  >
                    <span className="text-lg">👋</span>
                  </div>
                  <div>
                    <p className="font-medium text-[14px]" style={{ color: "#3C2A4D" }}>Bjud in via länk</p>
                    <p className="font-light text-[12px]" style={{ color: "#7A6A85" }}>
                      Skicka en länk – de är med på sekunden
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleQRAction}
                  className="w-full flex items-center gap-3 text-left"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #EDE8E0",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "#EAF2E8" }}
                  >
                    <span className="text-lg">📱</span>
                  </div>
                  <div>
                    <p className="font-medium text-[14px]" style={{ color: "#3C2A4D" }}>Visa QR-kod</p>
                    <p className="font-light text-[12px]" style={{ color: "#7A6A85" }}>
                      Perfekt om ni är på samma plats
                    </p>
                  </div>
                </button>
              </div>

              <p className="text-center text-[11px] mb-6" style={{ color: "#B0A8B5" }}>
                Du kan alltid bjuda in fler senare från Min krets.
              </p>

              <OnboardingButton onClick={handleFinish}>Klar – visa min by →</OnboardingButton>
            </StepCard>
          )}
        </AnimatePresence>
      </div>

      {/* Invite sheet (reusing existing component logic) */}
      <InviteSheet open={showInvite} onOpenChange={setShowInvite} />
      <QRCodeSheet open={showQR} onOpenChange={setShowQR} />
    </div>
  );
};

/** Animated wrapper */
const StepCard = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 30 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -30 }}
    transition={{ duration: 0.35, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

/** Primary CTA button */
const OnboardingButton = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full text-[14px] font-medium"
    style={{
      backgroundColor: "#3C2A4D",
      color: "#fff",
      borderRadius: 99,
      height: 52,
      border: "none",
      cursor: "pointer",
    }}
  >
    {children}
  </button>
);

/** Invite link sheet – extracted from InviteFriendDialog to be controllable */
import { Copy, Share2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

const InviteSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { user } = useAuth();
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!user || link) return;
    setLoading(true);
    try {
      const token = crypto.randomUUID();
      const { error } = await (supabase as any).from("invite_links").insert({
        created_by: user.id,
        token,
      });
      if (error) throw error;
      setLink(`${window.location.origin}/invite/${token}`);
    } catch {
      toast.error("Kunde inte skapa länk.");
    } finally {
      setLoading(false);
    }
  };

  // Generate link when sheet opens
  if (open && !link && !loading) {
    generate();
  }

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success("Länk kopierad!");
  };

  const handleShare = async () => {
    if (!link) return;
    if (navigator.share) {
      await navigator.share({
        title: "Gå med i min by på Minby",
        text: "Jag vill bjuda in dig till Minby.",
        url: link,
      });
    } else {
      handleCopy();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[20px] z-[70]"
        style={{ backgroundColor: "#F7F3EF", padding: "24px 16px" }}
      >
        <SheetHeader>
          <SheetTitle className="font-display text-base font-medium text-left">Bjud in någon</SheetTitle>
        </SheetHeader>
        <p className="text-sm mt-2 mb-4" style={{ color: "#7A6A85" }}>
          Dela länken via SMS, WhatsApp eller hur du vill.
        </p>
        {link ? (
          <>
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
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: "#3C2A4D", color: "#F7F3EF", borderRadius: 10, padding: 10,
                  fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
                }}
              >
                <Share2 style={{ width: 14, height: 14 }} /> Dela
              </button>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  background: "#EDE8F4", color: "#3C2A4D", borderRadius: 10, padding: 10,
                  fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
                }}
              >
                <Copy style={{ width: 14, height: 14 }} /> Kopiera
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-sm" style={{ color: "#B0A8B5" }}>Skapar länk…</p>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OnboardingFlow;
