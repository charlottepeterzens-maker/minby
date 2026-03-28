import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { resolveAvatarUrl } from "@/utils/avatarUrl";

interface FeedAvatarProps {
  avatarUrl: string | null;
  displayName: string | null;
  initials: string;
  size?: string;
  onClick?: () => void;
}

const FeedAvatar = ({ avatarUrl, displayName, initials, size = "w-9 h-9", onClick }: FeedAvatarProps) => {
  const Wrapper = onClick ? "button" : "div";
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  return (
    <Wrapper onClick={onClick} className="shrink-0">
      <Avatar className={size}>
        {resolvedUrl && (
          <AvatarImage src={resolvedUrl} alt={displayName || "Profilbild"} className="object-cover" />
        )}
        <AvatarFallback
          style={{ backgroundColor: "hsl(var(--color-surface-raised))", color: "hsl(var(--color-text-primary))" }}
          className="text-xs font-medium"
        >
          {initials}
        </AvatarFallback>
      </Avatar>
    </Wrapper>
  );
};

export default FeedAvatar;
