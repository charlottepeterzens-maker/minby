import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import TextButton from "@/components/ui/text-button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const SHOW_COUNT_KEY = "pwa-install-show-count";

const MAX_SHOWS = 3;
const DELAY_MS = 10000;

const PWAInstallBanner = () => {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const shownCount = Number(localStorage.getItem(SHOW_COUNT_KEY) ?? 0);

    if (shownCount >= MAX_SHOWS) {
      localStorage.setItem(DISMISS_KEY, "true");
      return;
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone;

    if (standalone) return;

    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", beforeInstall);

    const timer = setTimeout(() => {
      setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

      setShow(true);

      localStorage.setItem(
        SHOW_COUNT_KEY,
        String(shownCount + 1)
      );
    }, DELAY_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(
        "beforeinstallprompt",
        beforeInstall
      );
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setShow(false);
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      dismiss();
    }

    setDeferredPrompt(null);
  };

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.section
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-32 inset-x-4 z-50"
          >
            <div className="rounded-card bg-burgundy p-5 shadow-soft">

              <div className="flex items-start justify-between mb-2">

                <span className="text-eyebrow text-accent-primary">
                  Tips
                </span>

                <button
                  onClick={dismiss}
                  aria-label="Stäng"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:opacity-70 transition-opacity"
                >
                  <X
                    size={18}
                    className="text-white"
                  />
                </button>

              </div>

              <h3 className="text-heading-md text-white mb-2">
                Ha Minby nära till hands
              </h3>

              <p className="text-body text-surface-card-primary mb-5">
                Lägg Minby på hemskärmen så öppnas appen direkt,
                precis som vilken annan app som helst.
              </p>

              <TextButton
                onClick={handleInstall}
              >
                Lägg till på hemskärmen
              </TextButton>

            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {showGuide && (
        <IOSInstallBottomSheet
          open={showGuide}
          onClose={() => setShowGuide(false)}
        />
      )}
    </>
  );
};

export default PWAInstallBanner;
