import { useEffect, useState } from "react";
import { Share } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { BottomSheetBody, BottomSheetContent, BottomSheetHeader } from "@/components/ui/bottom-sheet";
import { Typography } from "@/components/ui/typography";
import TextButton from "@/components/ui/text-button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lastSenderName: string;
}

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

const AddToHomeScreenSheet = ({ open, onOpenChange, lastSenderName }: Props) => {
  const [stage, setStage] = useState<"ask" | "steps">("ask");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (open) setStage("ask");
  }, [open]);

  const handleShowMe = async () => {
    if (isIOS) {
      setStage("steps");
      return;
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent>
        <BottomSheetHeader title={`Vill du veta när ${lastSenderName || "någon"} svarar?`} />
        <BottomSheetBody className="px-5 pt-200 pb-500 space-y-400">
          {stage === "ask" ? (
            <>
              <Typography variant="body" as="p" style={{ color: "hsl(var(--color-text-secondary))" }}>
                Lägg till Minby på hemskärmen så ser du direkt när det händer något i kretsen.
              </Typography>
              <div className="flex items-center gap-400">
                <TextButton onClick={handleShowMe}>Visa mig hur</TextButton>
                <TextButton variant="secondary" onClick={() => onOpenChange(false)}>
                  Inte nu
                </TextButton>
              </div>
            </>
          ) : (
            <>
              <ol className="space-y-300">
                {[
                  <>Tryck på <Share className="inline w-4 h-4 -mt-0.5" /> Dela-ikonen längst ner i Safari.</>,
                  <>Bläddra ner och välj &quot;Lägg till på hemskärmen&quot;.</>,
                  <>Tryck på &quot;Lägg till&quot; uppe till höger.</>,
                ].map((content, i) => (
                  <li key={i} className="flex items-start gap-300">
                    <Typography
                      variant="meta"
                      as="span"
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "hsl(44, 65%, 93%)", color: "hsl(44, 65%, 28%)", fontWeight: 500 }}
                    >
                      {i + 1}
                    </Typography>
                    <Typography variant="body" as="span" className="pt-0.5" style={{ color: "hsl(var(--color-text-primary))" }}>
                      {content}
                    </Typography>
                  </li>
                ))}
              </ol>
              <TextButton onClick={() => onOpenChange(false)}>Klart</TextButton>
            </>
          )}
        </BottomSheetBody>
      </BottomSheetContent>
    </Sheet>
  );
};

export default AddToHomeScreenSheet;
