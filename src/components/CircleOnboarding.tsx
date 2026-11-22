import { useEffect, useState } from "react";
import { Typography } from "@/components/ui/typography";
import { typography } from "@/design-system/typography";
import { cn } from "@/lib/utils";

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

type StepKey = "invite" | "photo" | "tip";

const STEPS: { key: StepKey; label: string; cta: string }[] = [
  { key: "invite", label: "Bjud in fler till kretsen", cta: "Bjud in" },
  { key: "photo", label: "Lägg upp ett foto", cta: "Ladda upp" },
  { key: "tip", label: "Dela ett tips", cta: "Dela" },
];

const CircleOnboarding = ({
  circleId,
  circleName,
  hasMembers,
  hasPhotos,
  hasTips,
  onInvite,
  onPhoto,
  onTip,
}: Props) => {
  const storageKey = `minby_circle_onboarding_dismissed_${circleId}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  const done: Record<StepKey, boolean> = {
    invite: hasMembers,
    photo: hasPhotos,
    tip: hasTips,
  };

  const doneCount = Object.values(done).filter(Boolean).length;
  const allDone = doneCount === STEPS.length;

  if (dismissed || allDone) return null;

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  const handlers: Record<StepKey, () => void> = {
    invite: onInvite,
    photo: onPhoto,
    tip: onTip,
  };

  return (
    <section className="mt-6 px-300">
      <div
        className="rounded-300 p-5"
        style={{ backgroundColor: "hsl(var(--primary))" }}
      >
        <div className="flex items-start justify-between mb-3">
          <Typography variant="heading" as="h3" style={{ color: "hsl(var(--text-inverse))" }}>
            Kom igång med {circleName} · {doneCount}/{STEPS.length}
          </Typography>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Stäng onboarding"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-70 -mt-1 -mr-1 shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="hsl(var(--text-inverse))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6L18 18" />
            </svg>
          </button>
        </div>

        <ul
          className="divide-y"
          style={{ borderColor: "rgba(255,255,255,0.10)" }}
        >
          {STEPS.map((s) => {
            const isDone = done[s.key];
            return (
              <li
                key={s.key}
                className="py-200 flex items-center justify-between gap-300"
              >
                <Typography
                  variant="body"
                  className="min-w-0 truncate"
                  style={{
                    color: "hsl(var(--text-inverse))",
                    textDecoration: isDone ? "line-through" : "none",
                    opacity: isDone ? 0.55 : 1,
                  }}
                >
                  {s.label}
                </Typography>

                {isDone ? (
                  <span
                    className={cn(typography.action, "shrink-0")}
                    style={{ color: "hsl(var(--butter-100))", opacity: 0.7 }}
                  >
                    Klart
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handlers[s.key]}
                    className={cn(typography.action, "underline underline-offset-2 decoration-1 shrink-0")}
                    style={{
                      color: "hsl(var(--text-inverse))",
                      textDecorationColor: "hsl(var(--color-accent-terra))",
                    }}
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
