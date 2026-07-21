<div className="flex items-start justify-between mb-2">
  <div
    className="text-[10px] font-normal tracking-[0.02em]"
    style={{ color: "#C85A2E" }}
  >
    {doneCount} av {STEPS.length} klara
  </div>

  <button
    type="button"
    onClick={dismiss}
    aria-label="Stäng onboarding"
    className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-70"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
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

    <h3
      className="text-[18px] font-semibold leading-none mb-2"
      style={{ color: "#FFFFFF" }}
    >
      Kom igång med {circleName}
    </h3>

    <p
      className="text-[14px] leading-[120%] mb-5"
      style={{ color: "rgba(255,255,255,0.82)" }}
    >
      Tre snabba steg så börjar det hända grejer här.
    </p>

    <ul
      className="divide-y"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
      }}
    >
      {STEPS.map((s) => {
        const isDone = done[s.key];

        return (
          <li
            key={s.key}
            className="py-4 flex items-start justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div
                className="text-[14px] font-medium leading-[120%]"
                style={{
                  color: "#FFFFFF",
                  textDecoration: isDone ? "line-through" : "none",
                  opacity: isDone ? 0.55 : 1,
                }}
              >
                {s.label}
              </div>

              {!isDone && (
                <div
                  className="mt-1 text-[10px] tracking-[0.02em]"
                  style={{
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  {s.hint}
                </div>
              )}
            </div>

            {isDone ? (
              <span
                className="text-[10px] tracking-[0.02em]"
                style={{
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                Klart
              </span>
            ) : (
              <button
                type="button"
                onClick={handlers[s.key]}
                className="text-[14px] font-medium underline underline-offset-2 decoration-1 shrink-0"
                style={{
                  color: "#FFFFFF",
                  textDecorationColor: "#C85A2E",
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
