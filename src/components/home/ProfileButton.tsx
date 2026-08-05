import { Typography } from "@/components/ui/typography";

export interface ProfileSummary {
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  profile: ProfileSummary;
  onOpen: () => void;
  expanded?: boolean;
}

/** Round profile entry point that opens My Menu. */
const ProfileButton = ({ profile, onOpen, expanded = false }: Props) => {
  const initials = (profile.display_name ?? "?")
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label="Öppna min meny"
      className="w-11 h-11 rounded-avatar overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: profile.avatar_url ? "transparent" : "hsl(var(--butter-100))" }}
    >
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="Din profilbild" className="w-full h-full object-cover" />
      ) : (
        <Typography as="span" variant="action" className="text-foreground">{initials}</Typography>
      )}
    </button>
  );
};

export default ProfileButton;
