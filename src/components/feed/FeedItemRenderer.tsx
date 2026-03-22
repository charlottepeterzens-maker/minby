import { FeedPostCard } from "./FeedPostCard";
import { FeedHangoutCard } from "./FeedHangoutCard";
import { FeedHealthCard } from "./FeedHealthCard";

export const FeedItemRenderer = ({ item }: { item: any }) => {
  switch (item.type) {
    case "posts":
      return <FeedPostCard post={item.data} />;

    case "hangout":
      return <FeedHangoutCard hangout={item.data} />;

    case "tips":
      return <FeedHealthCard tip={item.data} />;

    default:
      return null;
  }
};
