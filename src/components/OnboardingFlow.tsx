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
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: "hsl(var(--color-surface))" }}>
      <div className="w-full max-w-sm">
        {dots}

        <AnimatePresence mode="wait">
          {step === 0 && (
            <StepCard key="s0">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "hsl(var(--color-text-primary))" }}>
                Välkommen till Minby
              </h1>

              <p className="font-light text-[15px] leading-relaxed mb-8" style={{ color: "hsl(var(--color-text-secondary))" }}>
                Minby är inte en till social app. Det är ett litet, slutet ställe för dig och de som faktiskt betyder något. Din krets. Här finns inga algoritmer, inga likes och inga följare. Bara ni.
              </p>

              <OnboardingButton onClick={next}>Fortsätt →</OnboardingButton>
            </StepCard>
          )}

          {step === 1 && (
            <StepCard key="s1">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "hsl(var(--color-text-primary))" }}>
                Dela din vardag
              </h1>

              <p className="font-light text-[15px] leading-relaxed mb-6" style={{ color: "hsl(var(--color-text-secondary))" }}>
                Skriv något kort om vad som hänt. En bild från lunchen, något barnen sa, en seger på jobbet. Sånt som de som verkligen bryr sig vill veta.
              </p>

              <OnboardingButton onClick={next}>Fortsätt →</OnboardingButton>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard key="s2">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "hsl(var(--color-text-primary))" }}>
                Ses vi?
              </h1>

              <p className="font-light text-[15px] leading-relaxed mb-8" style={{ color: "hsl(var(--color-text-secondary))" }}>
                Är du ledig och vill hitta på något? Föreslå en träff eller berätta att du är sugen på spa men inte vet när. Dina närmaste svarar med "Jag kan" eller "Kanske".
              </p>

              <OnboardingButton onClick={next}>Fortsätt →</OnboardingButton>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard key="s3">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "hsl(var(--color-text-primary))" }}>
                Sällskap & Tips
              </h1>

              <p className="font-light text-[15px] leading-relaxed mb-4" style={{ color: "hsl(var(--color-text-secondary))" }}>
                En chatt utan reels och störningsmoment. Bara ni och det som faktiskt händer i era liv. Planera att ses, starta en bokklubb, rösta om vart ni ska äta. Låt AI sammanfatta vad ni kommit fram till.
              </p>

              <p className="font-light text-[15px] leading-relaxed mb-8" style={{ color: "hsl(var(--color-text-secondary))" }}>
                Dela dina vardagsfavoriter. Den nya ansiktskrämen, bästa vinstället i stan eller podden du lyssnar på varje morgon.
              </p>

              <OnboardingButton onClick={next}>
                Fortsätt →
              </OnboardingButton>
            </StepCard>
          )}

          {step === 4 && (
            <StepCard key="s4">
              <h1 className="font-fraunces text-[22px] font-medium leading-snug mb-4" style={{ color: "hsl(var(--color-text-primary))" }}>
                Bjud in din krets
              </h1>

              <p className="font-light text-[15px] leading-relaxed mb-4" style={{ color: "hsl(var(--color-text-secondary))" }}>
                Minby är inte till för att samla följare eller visa upp sig. Det är till för att faktiskt hålla kontakten och faktiskt ses.
              </p>

              <p className="font-light text-[15px] leading-relaxed mb-6" style={{ color: "hsl(var(--color-text-secondary))" }}>
                Bjud in en person du faktiskt vill hålla kontakten med. Det är där allt börjar.
              </p>

              <div className="space-y-3 mb-4">
                <button
                  onClick={() => setShowInvite(true)}
                  className="w-full text-left"
                  style={{
                    backgroundColor: "hsl(var(--color-surface-card))",
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
                    backgroundColor: "hsl(var(--color-surface-card))",
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
      backgroundColor: "hsl(var(--color-text-primary))",
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
        style={{ backgroundColor: "hsl(var(--color-surface))", padding: "24px 16px" }}
      >
        <SheetHeader>
          <SheetTitle className="font-display text-base font-medium text-left">Bjud in någon</SheetTitle>
        </SheetHeader>

        {link ? (
          <>
            <div
              style={{
                background: "hsl(var(--color-surface-raised))",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 12,
                color: "hsl(var(--color-text-primary))",
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
                  borderRadius: 8,
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
                  background: "hsl(var(--color-surface-raised))",
                  color: "hsl(var(--color-text-primary))",
                  borderRadius: 8,
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
          <p className="text-center text-sm" style={{ color: "hsl(var(--color-text-faint))" }}>
            Skapar länk…
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OnboardingFlow;
