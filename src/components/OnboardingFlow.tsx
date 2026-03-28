import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import QRCodeSheet from "@/components/profile/QRCodeSheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

interface Props {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: Props) => {
  const { user } = useAuth();

  const [step, setStep] = useState(0);
  const [intent, setIntent] = useState<"meet" | "browse" | "unsure" | null>(null);

  const [showInvite, setShowInvite] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const markOnboarded = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() } as any)
      .eq("user_id", user.id);
  };

  const next = () => {
    if (step < 4) setStep(step + 1);
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "#F7F3EF" }}>
      <div className="w-full max-w-sm">
        {dots}

        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepCard key="s0">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "#3C2A4D" }}>
                Du har sagt "vi måste ses" och menat det. Ändå gick månaderna.
              </h1>

              <p className="font-light text-[15px] leading-relaxed mb-8" style={{ color: "#655675" }}>
                Vi vet vad som händer i varandras liv, men stannar sällan upp. Vi vet – men vi är inte riktigt där.
              </p>

              <OnboardingButton onClick={next}>Ja, precis så →</OnboardingButton>
            </StepCard>
          )}

          {step === 1 && (
            <StepCard key="s1">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "#3C2A4D" }}>
                Minby är något annat.
              </h1>

              <p className="font-light text-[15px] leading-relaxed mb-6" style={{ color: "#655675" }}>
                En liten, sluten plats – bara för de du faktiskt håller av. Inget brus. Bara din närmaste krets.
              </p>

              <OnboardingButton onClick={next}>Det låter rätt →</OnboardingButton>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard key="s2">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "#3C2A4D" }}>
                Två enkla saker.
              </h1>

              <p className="font-light text-[15px] leading-relaxed mb-8" style={{ color: "#655675" }}>
                Dela det som faktiskt händer. Och när du vill ses – säg till.
              </p>

              <OnboardingButton onClick={next}>Enkelt →</OnboardingButton>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard key="s3">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "#3C2A4D" }}>
                Hur känns det just nu?
              </h1>

              <div className="space-y-2 mb-6">
                <button
                  onClick={() => setIntent("meet")}
                  className="w-full text-left"
                  style={{
                    backgroundColor: intent === "meet" ? "#EDE8F4" : "#FFFFFF",
                    border: intent === "meet" ? "1.5px solid #3C2A4D" : "none",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  Sugen på att ses
                </button>

                <button
                  onClick={() => setIntent("browse")}
                  className="w-full text-left"
                  style={{
                    backgroundColor: intent === "browse" ? "#EDE8F4" : "#FFFFFF",
                    border: intent === "browse" ? "1.5px solid #3C2A4D" : "none",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  Vill mest kolla läget
                </button>

                <button
                  onClick={() => setIntent("unsure")}
                  className="w-full text-left"
                  style={{
                    backgroundColor: intent === "unsure" ? "#EDE8F4" : "#FFFFFF",
                    border: intent === "unsure" ? "1.5px solid #3C2A4D" : "none",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  Vet inte riktigt
                </button>
              </div>

              <OnboardingButton onClick={next} disabled={!intent}>
                Fortsätt →
              </OnboardingButton>
            </StepCard>
          )}

          {step === 4 && (
            <StepCard key="s4">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "#3C2A4D" }}>
                {intent === "meet" ? "Vem hade du velat ses med?" : "Vem vill du ha i din by?"}
              </h1>

              <p className="font-light text-[15px] leading-relaxed mb-6" style={{ color: "#655675" }}>
                {intent === "meet"
                  ? "Tänk på någon du skulle vilja träffa snart. Bjud in – det tar en minut."
                  : "Bjud in en person du faktiskt vill hålla kontakten med. Det är där allt börjar."}
              </p>

              <div className="space-y-3 mb-4">
                <button
                  onClick={() => setShowInvite(true)}
                  className="w-full text-left"
                  style={{
                    backgroundColor: "#FFFFFF",
                     border: "none",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  Bjud in via länk
                </button>

                <button
                  onClick={() => setShowQR(true)}
                  className="w-full text-left"
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "none",
                    borderRadius: 8,
                    padding: "14px 16px",
                  }}
                >
                  Visa QR-kod
                </button>
              </div>

              <OnboardingButton onClick={handleFinish}>Klar – visa min by →</OnboardingButton>
            </StepCard>
          )}
        </AnimatePresence>
      </div>

      <InviteSheet open={showInvite} onOpenChange={setShowInvite} />
      <QRCodeSheet open={showQR} onOpenChange={setShowQR} />
    </div>
  );
};

const StepCard = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {children}
  </motion.div>
);

const OnboardingButton = ({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full text-[14px] font-medium"
    style={{
      backgroundColor: "#3C2A4D",
      color: "#fff",
      borderRadius: 99,
      height: 52,
      border: "none",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.5 : 1,
    }}
  >
    {children}
  </button>
);

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
        text: "Jag vill bjuda in dig.",
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
                  flex: 1,
                  background: "#3C2A4D",
                  color: "#F7F3EF",
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                }}
              >
                Dela
              </button>

              <button
                onClick={handleCopy}
                style={{
                  flex: 1,
                  background: "#EDE8F4",
                  color: "#3C2A4D",
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                }}
              >
                Kopiera
              </button>
            </div>
          </>
        ) : (
          <p className="text-center text-sm" style={{ color: "#857A8F" }}>
            Skapar länk…
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OnboardingFlow;
