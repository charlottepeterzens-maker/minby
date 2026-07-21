import { useEffect, useState } from "react";

interface Step {
  key: "invite" | "photo" | "tip";
  label: string;
  hint: string;
  cta: string;
}

const STEPS: Step[] = [
  { key: "invite", label: "Bjud in dina vänner", hint: "En krets blir liv när fler är med.", cta: "Bjud in" },
  { key: "photo", label: "Lägg upp ett foto", hint: "Ett minne, en stämning, en ny plats.", cta: "Ladda upp" },
  { key: "tip", label: "Dela ett tips", hint: "Något du älskar just nu.", cta: "Dela" },
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
      <div className="rounded-[26px] p-5" style={{ backgroundColor: "#F561828" }}>
        <div className="flex items-start justify-between mb-1">
          <div className="text-[10px] font-medium" style={{ color: "#C85A2E" }}>
            {doneCount} av {STEPS.length} klara
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-[13px] font-medium underline underline-offset-2 decoration-1"
            style={{ color: "#FFFFFF", textDecorationColor: "#C85A2E" }}
          >
            Stäng
          </button>
        </div>

        <h3 className="text-[18px] mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: "#FFFFFF" }}>
          Kom igång med {circleName}
        </h3>
        <p className="text-[13px] mb-4" style={{ color: "#675332" }}>
          Tre snabba steg så börjar det hända grejer här.
        </p>

        <ul className="divide-y" style={{ borderColor: "rgba(103,83,50,0.15)" }}>
          {STEPS.map((s) => {
            const isDone = done[s.key];
            return (
              <li key={s.key} className="py-3 flex items-baseline gap-3">
                <span className="flex-1 min-w-0">
                  <span
                    className="block text-[16px] font-medium"
                    style={{
                      color: "#FFFFFF",
                      textDecoration: isDone ? "line-through" : "none",
                      opacity: isDone ? 0.6 : 1,
                    }}
                  >
                    {s.label}
                  </span>
                  {!isDone && (
                    <span className="block text-[12px] mt-0.5" style={{ color: "#DAEAF6" }}>
                      {s.hint}
                    </span>
                  )}
                </span>
                {isDone ? (
                  <span className="text-[12px]" style={{ color: "#DAEAF6" }}>Klart</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlers[s.key]()}
                    className="text-[16px] font-medium underline underline-offset-2 decoration-1 flex-shrink-0"
                    style={{ color: "#FFFFFF", textDecorationColor: "#C85A2E" }}
                  >
                    {s.cta}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default CircleOnboarding;
