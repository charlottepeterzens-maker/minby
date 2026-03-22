import FeedPostCard from "./FeedPostCard";
import FeedHangoutCard from "./FeedHangoutCard";
import FeedHealthCard from "./FeedHealthCard";

export const FeedItemRenderer = ({ item }: { item: any }) => {
  const data = item.data;
  const profile = {
    display_name: data.profiles?.display_name || data.display_name || null,
    avatar_url: data.profiles?.avatar_url || data.avatar_url || null,
    initials: (data.profiles?.display_name || data.display_name || "?").slice(0, 2).toUpperCase(),
  };
  const onProfileClick = () => {};

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
          }}
          profile={profile}
          onProfileClick={onProfileClick}
        />
      );

    case "tips":
      return (
        <FeedHealthCard
          post={{
            id: data.id,
            content: data.comment || data.title || null,
            created_at: data.created_at,
            sectionName: data.category || "",
          }}
          profile={profile}
          onProfileClick={onProfileClick}
        />
      );

    default:
      return null;
  }
};
