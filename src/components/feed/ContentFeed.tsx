import { FeedItemRenderer } from "./FeedItemRenderer";

type Props = {
  items: any[];
};

export const ContentFeed = ({ items }: Props) => {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FeedItemRenderer key={item.data.id} item={item} />
      ))}
    </div>
  );
};
