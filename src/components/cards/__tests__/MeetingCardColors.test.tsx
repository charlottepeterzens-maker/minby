import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MeetingCard from "../MeetingCard";
import { MeetingCardSkeleton, CircleCardSkeleton, TipTileSkeleton } from "../CardSkeletons";

/**
 * Visual regression (color) tests for Ses-korten och skeletons.
 * Låser fast bakgrunds- och textfärger så framtida ändringar inte
 * råkar bryta designsystemet.
 */

const MEETING_BG = "rgb(242, 236, 227)"; // #F2ECE3
const EYEBROW = "rgb(103, 83, 50)";      // #675332
const RESPONSE = "rgb(86, 24, 40)";      // #561828
const CORAL_UNDERLINE = "rgb(200, 90, 46)"; // #C85A2E
const CIRCLE_BG = "rgb(249, 243, 225)";  // #F9F3E1
const SKELETON_BLOCK = "rgb(232, 221, 198)"; // #E8DDC6

describe("MeetingCard färger", () => {
  it("har korrekt bakgrund och textfärger", () => {
    const { container, getByText } = render(
      <MeetingCard
        hostName="Sara"
        dateLabel="Fre 21 nov"
        title="Fika på Café"
        responseCount={0}
        onRespond={() => {}}
      />
    );

    const card = container.querySelector("button")!;
    expect(card.style.backgroundColor).toBe(MEETING_BG);

    expect((getByText("Sara") as HTMLElement).style.color).toBe(EYEBROW);
    expect((getByText("Ingen har svarat") as HTMLElement).style.color).toBe(RESPONSE);

    const cta = getByText("Häng med!") as HTMLElement;
    expect(cta.style.textDecorationColor).toBe(CORAL_UNDERLINE);
  });
});

describe("Skeleton färger", () => {
  it("MeetingCardSkeleton har rätt bakgrund", () => {
    const { container } = render(<MeetingCardSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.backgroundColor).toBe(MEETING_BG);
  });

  it("CircleCardSkeleton har rätt bakgrund", () => {
    const { container } = render(<CircleCardSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.backgroundColor).toBe(CIRCLE_BG);
  });

  it("TipTileSkeleton använder sandfärg", () => {
    const { container } = render(<TipTileSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.backgroundColor).toBe(SKELETON_BLOCK);
  });
});
