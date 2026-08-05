import { Typography } from "@/components/ui/typography";

export interface ProfileSummary {
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  profile: ProfileSummary;
  onOpen: () => void;
}

const initialsOf = (name: string | null) =>
  (name ?? "?")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/** ProfileButton — opens the user's own menu. No menu logic lives here. */
const ProfileButton = ({ profile, onOpen }: Props) => (
  <button
    type="button"
    onClick={onOpen}
    aria-label="Öppna min meny"
    aria-haspopup="dialog"
    className="w-10 h-10 shrink-0 rounded-avatar overflow-hidden flex items-center justify-center bg-butter-100"
  >
    {profile.avatar_url ? (
      <img src={profile.avatar_url} alt={profile.display_name ?? "Min profilbild"} className="w-full h-full object-cover" />
    ) : (
      <Typography as="span" variant="action" style={{ color: "hsl(var(--color-text-tertiary))" }}>
        {initialsOf(profile.display_name)}
      </Typography>
    )}
  </button>
);

export default ProfileButton;
