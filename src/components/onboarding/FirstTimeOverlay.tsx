import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onComplete: () => void;
  onDismiss: () => void;
}

const FirstTimeOverlay = ({ onComplete, onDismiss }: Props) => {
  const [step, setStep] = useState<"intro" | "intent" | "done">("intro");
  const [intent, setIntent] = useState<"meet" | "browse" | "unsure" | null>(null);

  const next = () => {
    if (step === "intro") setStep("intent");
    else if (step === "intent") setStep("done");
  };

  const handleFinish = () => {
    if (intent) {
      localStorage.setItem("minby_intent", intent);
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-5 bg-black/30 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        {step === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -12 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[320px]"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #EDE8F4",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h2 className="text-center mb-3" style={{ fontSize: 18, color: "#3C2A4D" }}>
              Det ska vara lättare att ses.
            </h2>

            <p className="text-center mb-6" style={{ fontSize: 13, color: "#7A6A85", lineHeight: 1.6 }}>
              Minby hjälper dig ta små steg mot att faktiskt hålla kontakten.
            </p>

            <button
              onClick={next}
              className="w-full"
              style={{
                backgroundColor: "#3C2A4D",
                color: "#fff",
                borderRadius: 20,
                height: 44,
                border: "none",
              }}
            >
              Fortsätt
            </button>

            <button
              onClick={onDismiss}
              className="w-full mt-3 text-[12px]"
              style={{ color: "#7A6A85", background: "none", border: "none" }}
            >
              Hoppa över
            </button>
          </motion.div>
        )}

        {step === "intent" && (
          <motion.div
            key="intent"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[320px]"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #EDE8F4",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h2 className="text-center mb-4" style={{ fontSize: 18, color: "#3C2A4D" }}>
              Hur känns det just nu?
            </h2>

            <div className="space-y-2 mb-6">
              <button
                onClick={() => setIntent("meet")}
                className="w-full text-left"
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: intent === "meet" ? "1.5px solid #3C2A4D" : "1px solid #EDE8E0",
                  backgroundColor: intent === "meet" ? "#EDE8F4" : "#FFFFFF",
                }}
              >
                Sugen på att ses
              </button>

              <button
                onClick={() => setIntent("browse")}
                className="w-full text-left"
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: intent === "browse" ? "1.5px solid #3C2A4D" : "1px solid #EDE8E0",
                  backgroundColor: intent === "browse" ? "#EDE8F4" : "#FFFFFF",
                }}
              >
                Vill mest kolla läget
              </button>

              <button
                onClick={() => setIntent("unsure")}
                className="w-full text-left"
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: intent === "unsure" ? "1.5px solid #3C2A4D" : "1px solid #EDE8E0",
                  backgroundColor: intent === "unsure" ? "#EDE8F4" : "#FFFFFF",
                }}
              >
                Vet inte riktigt
              </button>
            </div>

            <button
              onClick={next}
              disabled={!intent}
              className="w-full"
              style={{
                backgroundColor: "#3C2A4D",
                color: "#fff",
                borderRadius: 20,
                height: 44,
                border: "none",
                opacity: intent ? 1 : 0.5,
              }}
            >
              Fortsätt
            </button>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-[320px]"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #EDE8F4",
              borderRadius: 16,
              padding: 24,
              textAlign: "center",
            }}
          >
            <p className="mb-4" style={{ fontSize: 14, color: "#7A6A85" }}>
              Du är igång.
            </p>

            <button
              onClick={handleFinish}
              className="w-full"
              style={{
                backgroundColor: "#3C2A4D",
                color: "#fff",
                borderRadius: 20,
                height: 44,
                border: "none",
              }}
            >
              Fortsätt
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FirstTimeOverlay;
