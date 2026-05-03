import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PersonBlock, { PersonData } from "./PersonBlock";

const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "me" } }),
}));

const insertMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: insertMock }) },
}));

vi.mock("@/hooks/useSignedImageUrl", () => ({
  useSignedImageUrl: () => null,
}));

vi.mock("@/components/LazyImage", () => ({
  default: () => null,
}));

vi.mock("@/components/ImageLightbox", () => ({
  default: () => null,
}));

vi.mock("@/components/profile/HangoutDetailSheet", () => ({
  default: () => null,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const basePerson: PersonData = {
  userId: "u1",
  displayName: "Sara Andersson",
  avatarUrl: null,
  initials: "SA",
  latestPost: {
    id: "p1",
    content: "Hej världen",
    image_url: null,
    created_at: new Date().toISOString(),
    sectionName: "Vardag",
    photo_layout: "single",
  },
  recentPosts: [
    {
      id: "p1",
      content: "Hej världen",
      image_url: null,
      created_at: new Date().toISOString(),
      sectionName: "Vardag",
      photo_layout: "single",
    },
  ],
  postCountLast7Days: 1,
  activeHangout: null,
  latestTip: null,
  lastActivityAt: new Date().toISOString(),
  isQuiet: false,
};

beforeEach(() => {
  navigateMock.mockClear();
  insertMock.mockClear();
});

describe("PersonBlock", () => {
  it("klick på rad expanderar och visar inlägg utan att navigera", () => {
    render(<PersonBlock person={basePerson} currentUserName="Mig" />);
    const name = screen.getByText("Sara Andersson");
    fireEvent.click(name);
    expect(navigateMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Se alla delar i/)).toBeInTheDocument();
  });

  it("klick på avatar navigerar till profilen utan att expandera", () => {
    const { container } = render(
      <PersonBlock person={basePerson} currentUserName="Mig" />
    );
    const avatarBtn = container.querySelector("button.shrink-0") as HTMLElement;
    expect(avatarBtn).toBeTruthy();
    fireEvent.click(avatarBtn);
    expect(navigateMock).toHaveBeenCalledWith("/profile/u1");
    // Inte expanderad — footern ska inte finnas
    expect(screen.queryByText(/Se alla delar i/)).not.toBeInTheDocument();
  });

  it("footer-knappen navigerar till profilen och stannar inte expansionen", () => {
    render(<PersonBlock person={basePerson} currentUserName="Mig" />);
    fireEvent.click(screen.getByText("Sara Andersson"));
    const footerBtn = screen.getByText(/Se alla delar i/);
    navigateMock.mockClear();
    fireEvent.click(footerBtn);
    expect(navigateMock).toHaveBeenCalledWith("/profile/u1");
    // Fortfarande expanderad efter klick (stopPropagation hindrar header-toggle)
    expect(screen.getByText(/Se alla delar i/)).toBeInTheDocument();
  });

  it("Skicka en tanke triggar insert utan att toggla expansion", async () => {
    const quietPerson = { ...basePerson, isQuiet: true };
    render(<PersonBlock person={quietPerson} currentUserName="Mig" />);
    const btn = screen.getByText("Skicka en tanke");
    fireEvent.click(btn);
    expect(insertMock).toHaveBeenCalled();
    // Inte expanderad
    expect(screen.queryByText(/Se alla delar i/)).not.toBeInTheDocument();
  });
});
