import { useNavigate } from "react-router-dom";
import FeedPostCard from "./FeedPostCard";
import FeedHangoutCard from "./FeedHangoutCard";
import FeedTipCard from "./FeedTipCard";

export const FeedItemRenderer = ({ item }: { item: any }) => {
  const navigate = useNavigate();
  const data = item.data;
  const userId = data.user_id;
  const displayName = data.profiles?.display_name || data.display_name || null;
  const avatarUrl = data.profiles?.avatar_url || data.avatar_url || null;
  const initials = displayName
    ? displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const profile = { display_name: displayName, avatar_url: avatarUrl, initials };
  const onProfileClick = () => {
    if (userId) navigate(`/profile/${userId}`);
  };

  switch (item.type) {
    case "posts":
      return (
        <FeedPostCard
          post={{
            id: data.id,
            content: data.content,
            image_url: data.image_url,
            link_url: data.link_url,
            created_at: data.created_at,
            sectionName: data.life_sections?.name || "",
            sectionType: data.life_sections?.section_type || "",
            photo_layout: data.photo_layout,
          }}
          profile={profile}
          onProfileClick={onProfileClick}
        />
      );

    case "hangout":
      return (
        <FeedHangoutCard
          hangout={{
            id: data.id,
            date: data.date,
            activities: data.activities || [],
            custom_note: data.custom_note,
            created_at: data.created_at,
            entry_type: data.entry_type,
            isMatch: data.isMatch,
          }}
          profile={profile}
          onProfileClick={onProfileClick}
        />
      );

    case "tips":
      return (
        <FeedTipCard
          tip={{
            id: data.id,
            title: data.title || "",
            comment: data.comment || null,
            category: data.category || "",
            url: data.url || null,
            created_at: data.created_at,
          }}
          profile={profile}
          onProfileClick={onProfileClick}
        />
      );

    default:
      return null;
  }
};
