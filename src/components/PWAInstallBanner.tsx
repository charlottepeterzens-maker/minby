import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWAInstallBanner = () => {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Also show on iOS Safari where beforeinstallprompt doesn't fire
  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isIOS && !isStandalone) {
      setTimeout(() => setShow(true), 2000);
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    }
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
          className="fixed bottom-20 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl p-4 shadow-lg"
          style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #EDE8F4" }}
        >
          <div
            className="shrink-0 flex items-center justify-center rounded-full"
            style={{ width: 40, height: 40, backgroundColor: "#3C2A4D" }}
          >
            <Download className="w-5 h-5" style={{ color: "#C9B8D8" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium" style={{ color: "#3C2A4D" }}>
              Lägg till Minby på din hemskärm
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="shrink-0 rounded-lg px-4 py-2 text-[12px] font-medium text-white"
            style={{ backgroundColor: "#3C2A4D" }}
          >
            Installera
          </button>
          <button onClick={dismiss} className="shrink-0 p-1">
            <X className="w-4 h-4" style={{ color: "#7A6A85" }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PWAInstallBanner;
