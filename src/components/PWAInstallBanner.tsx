import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import TextButton from "@/components/ui/text-button";
import { colors, radius, spacing, typography } from "@/design-system";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
  }>;
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

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

    const shownCount = Number(
      localStorage.getItem(SHOW_COUNT_KEY) ?? 0
    );

    if (shownCount >= MAX_SHOWS) {
      localStorage.setItem(DISMISS_KEY, "true");
      return;
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean(
        (navigator as NavigatorWithStandalone).standalone
      );

    if (standalone) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    const timer = window.setTimeout(() => {
      setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
      setShow(true);

      localStorage.setItem(
        SHOW_COUNT_KEY,
        String(shownCount + 1)
      );
    }, DELAY_MS);

    return () => {
      window.clearTimeout(timer);

      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setShow(false);
    setShowGuide(false);
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
    <AnimatePresence>
      {show && (
        <motion.section
          initial={{ y: spacing[400], opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: spacing[400], opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed",
            left: spacing[300],
            right: spacing[300],
            bottom: spacing[500],
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: colors.berry[300],
              borderRadius: radius[300],
              padding: spacing[300],
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: spacing[200],
                marginBottom: spacing[200],
              }}
            >
              <span
                className={typography.meta.className}
                style={{
                  color: colors.berry[100],
                }}
              >
                Tips
              </span>

              <button
                type="button"
                onClick={dismiss}
                aria-label="Stäng"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: spacing[400],
                  height: spacing[400],
                  padding: 0,
                  border: 0,
                  background: "transparent",
                  color: colors.text.inverse,
                  cursor: "pointer",
                }}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <h3
              className={typography.heading.className}
              style={{
                color: colors.text.inverse,
                margin: 0,
                marginBottom: spacing[200],
              }}
            >
              Ha Minby nära till hands
            </h3>

            {!showGuide ? (
              <>
                <p
                  className={typography.body.className}
                  style={{
                    color: colors.text.inverse,
                    margin: 0,
                    marginBottom: spacing[300],
                  }}
                >
                  Lägg Minby på hemskärmen så öppnas appen
                  direkt, precis som vilken annan app som helst.
                </p>

                <TextButton onClick={handleInstall}>
                  Lägg till på hemskärmen
                </TextButton>
              </>
            ) : (
              <>
                <p
                  className={typography.body.className}
                  style={{
                    color: colors.text.inverse,
                    margin: 0,
                    marginBottom: spacing[300],
                  }}
                >
                  Tryck på dela-knappen i Safari och välj
                  ”Lägg till på hemskärmen”.
                </p>

                <TextButton onClick={dismiss}>
                  Jag förstår
                </TextButton>
              </>
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallBanner;
