import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MeetingCard from "../MeetingCard";
import { MeetingCardSkeleton, CircleCardSkeleton, TipTileSkeleton } from "../CardSkeletons";

/**
 * Visual regression (color) tests for Ses-korten och skeletons.
 * Låser fast bakgrunds- och textfärger så framtida ändringar inte
 * råkar bryta designsystemet.
 */

const EYEBROW = "rgb(103, 83, 50)";      // #675332
const RESPONSE = "rgb(86, 24, 40)";      // #561828
const CORAL_UNDERLINE = "#C85A2E";
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
    expect(card.className).toContain("bg-linen");

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
    expect(root.className).toContain("bg-linen");
  });

  it("CircleCardSkeleton har rätt bakgrund", () => {
    const { container } = render(<CircleCardSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("bg-butter-100");
  });

  it("TipTileSkeleton använder sandfärg", () => {
    const { container } = render(<TipTileSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.backgroundColor).toBe(SKELETON_BLOCK);
  });
});
