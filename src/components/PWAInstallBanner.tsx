import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallBanner = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    // Already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // iOS fallback – beforeinstallprompt doesn't fire on iOS
  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (ios && !isStandalone) {
      setIsIOS(true);
      setTimeout(() => setShow(true), 2500);
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        dismiss();
      }
      setDeferredPrompt(null);
      return;
    }
    // iOS – just dismiss since we show instructions
    dismiss();
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: "hsl(var(--color-surface-card))", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="shrink-0 flex items-center justify-center rounded-full"
              style={{ width: 40, height: 40, backgroundColor: "hsl(var(--color-text-primary))" }}
            >
              {isIOS ? (
                <Share className="w-5 h-5" style={{ color: "hsl(var(--color-border-lavender))" }} />
              ) : (
                <Download className="w-5 h-5" style={{ color: "hsl(var(--color-border-lavender))" }} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
                Lägg Minby på hemskärmen – öppna som en app
              </p>
              {isIOS && (
                <p className="text-[11px] mt-1 leading-snug" style={{ color: "hsl(var(--color-text-secondary))" }}>
                  Tryck på{" "}
                  <Share className="inline w-3 h-3 -mt-0.5" style={{ color: "hsl(var(--color-text-secondary))" }} />{" "}
                  Dela → Lägg till på hemskärmen
                </p>
              )}
            </div>

            {!isIOS && (
              <button
                onClick={handleInstall}
                className="shrink-0 rounded-lg px-4 py-2 text-[12px] font-medium text-white"
                style={{ backgroundColor: "hsl(var(--color-text-primary))" }}
              >
                Lägg till
              </button>
            )}

            <button onClick={dismiss} className="shrink-0 p-1">
              <X className="w-4 h-4" style={{ color: "hsl(var(--color-text-secondary))" }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallBanner;
