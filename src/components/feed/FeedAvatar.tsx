import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface FeedAvatarProps {
  avatarUrl: string | null;
  displayName: string | null;
  initials: string;
  size?: string;
  onClick?: () => void;
}

const FeedAvatar = ({ avatarUrl, displayName, initials, size = "w-9 h-9", onClick }: FeedAvatarProps) => {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper onClick={onClick} className="shrink-0">
      <Avatar className={size}>
        {avatarUrl && (
          <AvatarImage src={avatarUrl} alt={displayName || "Profilbild"} />
        )}
        <AvatarFallback
          style={{ backgroundColor: "#EDE8F4", color: "#3C2A4D" }}
          className="text-xs font-medium"
        >
          {initials}
        </AvatarFallback>
      </Avatar>
    </Wrapper>
  );
};

export default FeedAvatar;
