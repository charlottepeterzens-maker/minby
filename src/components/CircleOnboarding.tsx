import { useEffect, useState } from "react";
import { Check, X, Users, Image as ImageIcon, Lightbulb } from "lucide-react";

interface Step {
  key: "invite" | "photo" | "tip";
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Step[] = [
  { key: "invite", label: "Bjud in dina vänner", hint: "En krets blir liv när fler är med.", icon: Users },
  { key: "photo", label: "Lägg upp ett foto", hint: "Ett minne, en stämning, en ny plats.", icon: ImageIcon },
  { key: "tip", label: "Dela ett tips", hint: "Något du älskar just nu.", icon: Lightbulb },
];

interface Props {
  circleId: string;
  circleName: string;
  hasMembers: boolean;
  hasPhotos: boolean;
  hasTips: boolean;
  onInvite: () => void;
  onPhoto: () => void;
  onTip: () => void;
}

const CircleOnboarding = ({ circleId, circleName, hasMembers, hasPhotos, hasTips, onInvite, onPhoto, onTip }: Props) => {
  const storageKey = `minby_onboarding_${circleId}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === "done");
  }, [storageKey]);

  const done: Record<Step["key"], boolean> = {
    invite: hasMembers,
    photo: hasPhotos,
    tip: hasTips,
  };
  const doneCount = Object.values(done).filter(Boolean).length;
  const allDone = doneCount === STEPS.length;

  if (dismissed || allDone) return null;

  const dismiss = () => {
    localStorage.setItem(storageKey, "done");
    setDismissed(true);
  };

  const handlers: Record<Step["key"], () => void> = {
    invite: onInvite,
    photo: onPhoto,
    tip: onTip,
  };

  return (
    <section className="mt-6 px-4">
      <div className="rounded-[28px] p-5 relative" style={{ backgroundColor: "#F9F3E1" }}>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Stäng"
          className="absolute top-3 right-3 p-1.5 rounded-full"
          style={{ color: "#561828" }}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-[11px] mb-2 font-medium" style={{ color: "#561828" }}>
          {doneCount} av {STEPS.length} klara
        </div>
        <h3 className="text-[18px] mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: "#2B2B2B" }}>
          Kom igång med {circleName}
        </h3>
        <p className="text-[13px] mb-4" style={{ color: "#675332" }}>
          Tre snabba steg så börjar det hända grejer här.
        </p>

        <ul className="space-y-2">
          {STEPS.map((s) => {
            const isDone = done[s.key];
            const Icon = s.icon;
            return (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => !isDone && handlers[s.key]()}
                  disabled={isDone}
                  className="w-full flex items-center gap-3 text-left rounded-2xl p-3"
                  style={{
                    backgroundColor: isDone ? "rgba(200,90,46,0.08)" : "white",
                    opacity: isDone ? 0.7 : 1,
                  }}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: isDone ? "#C85A2E" : "#F2ECE3",
                      color: isDone ? "white" : "#561828",
                    }}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className="block text-[14px] font-medium"
                      style={{
                        color: "#2B2B2B",
                        textDecoration: isDone ? "line-through" : "none",
                      }}
                    >
                      {s.label}
                    </span>
                    {!isDone && (
                      <span className="block text-[12px] mt-0.5" style={{ color: "#675332" }}>
                        {s.hint}
                      </span>
                    )}
                  </span>
                  {!isDone && (
                    <span
                      className="text-[13px] font-medium underline underline-offset-2 decoration-1 flex-shrink-0"
                      style={{ color: "#2B2B2B", textDecorationColor: "#C85A2E" }}
                    >
                      Kör
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default CircleOnboarding;
